import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  ChevronLeft,
} from "lucide-react";
import type { VesselTemplate, SeatPosition } from "@/data/vesselTemplates";
import type { SeatStatus } from "@/types/database";
import { gridToIso, computeViewBox } from "./isoMath";
import { IsometricShipHull } from "./IsometricShipHull";
import { IsometricSeat } from "./IsometricSeat";
import { VesselSidebar } from "./VesselSidebar";

interface IsometricCabinStageProps {
  vessel: VesselTemplate;
  routeText: string;
  originName?: string;
  destName?: string;
  travelDate?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  basePrice?: number;
  businessPrice?: number;
  bookedSeatLabels?: string[];
  initialSelectedSeat?: string | null;
  onClose: () => void;
  onConfirmSeat: (seat: SeatPosition, totalAmount: number) => void;
  onSelectedSeatChange?: (seat: SeatPosition | null) => void;
}

// ────────────────────────────────────────────
// Pan & Zoom Boundaries: 100% to 250%
// Smooth static user zooming without camera compensation
// ────────────────────────────────────────────
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.5;

function clampPan(x: number, y: number, currentZoom: number) {
  if (currentZoom <= 1.02) {
    return { x: 0, y: 0 };
  }
  const zoomFactor = (currentZoom - 1.0) / (MAX_ZOOM - 1.0);
  const maxPanX = Math.round(300 * zoomFactor);
  const maxPanY = Math.round(250 * zoomFactor);
  return {
    x: Math.max(-maxPanX, Math.min(maxPanX, x)),
    y: Math.max(-maxPanY, Math.min(maxPanY, y)),
  };
}

export function IsometricCabinStage({
  vessel,
  routeText,
  originName,
  destName,
  travelDate,
  departureTime = "08:00",
  arrivalTime = "10:00",
  duration = "2h 00m",
  basePrice = 800,
  businessPrice,
  bookedSeatLabels = [],
  initialSelectedSeat = null,
  onClose,
  onConfirmSeat,
  onSelectedSeatChange,
}: IsometricCabinStageProps) {
  // Deck selection (defaults to first deck e.g. Economy Class)
  const [activeDeckId, setActiveDeckId] = useState<string>(
    vessel.decks[0]?.id ?? "main-tourist"
  );
  const [deckTransitioning, setDeckTransitioning] = useState(false);

  const activeDeck = useMemo(() => {
    return vessel.decks.find((d) => d.id === activeDeckId) ?? vessel.decks[0];
  }, [vessel.decks, activeDeckId]);

  // Selected seat
  const [selectedSeatLabel, setSelectedSeatLabel] = useState<string | null>(
    initialSelectedSeat
  );

  // Pan and Zoom with strict boundaries
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Calibrated pitch: generous executive pitch for Business Class (48 x 64), standard for Economy (41 x 56)
  const isBusiness = activeDeck.class === "business";
  const cellW = isBusiness ? 48 : 41;
  const cellH = isBusiness ? 64 : 56;

  // Compute SVG viewBox based on active deck and hull boundaries
  const viewBox = useMemo(() => {
    const bounds = isBusiness
      ? {
        minCol: -2.4,
        maxCol: activeDeck.columns + 1.4,
        minRow: -3.6,
        maxRow: activeDeck.rows + 4.2,
      }
      : {
        minCol: -2.2,
        maxCol: activeDeck.columns + 1.2,
        minRow: -3.4,
        maxRow: activeDeck.rows + 4.0,
      };

    return computeViewBox(
      activeDeck.columns,
      activeDeck.rows,
      cellW,
      cellH,
      36,
      90,
      bounds
    );
  }, [activeDeck.columns, activeDeck.rows, isBusiness, cellW, cellH]);

  // Booked seat lookup set
  const bookedSet = useMemo(() => {
    return new Set(bookedSeatLabels);
  }, [bookedSeatLabels]);

  // Projected & depth-sorted seats
  const projectedSeats = useMemo(() => {
    return activeDeck.seats
      .map((pos) => {
        const iso = gridToIso(pos.col, pos.row, cellW, cellH);
        const isBooked = bookedSet.has(pos.label);
        const status: SeatStatus = isBooked ? "booked" : "available";
        const price =
          pos.tier === "business"
            ? (businessPrice ?? Math.round(basePrice * 1.45))
            : basePrice;

        return {
          pos,
          screenX: iso.x,
          screenY: iso.y,
          depth: iso.depth,
          status,
          price,
        };
      })
      .sort((a, b) => a.depth - b.depth); // Painter's algorithm
  }, [activeDeck.seats, bookedSet, basePrice, businessPrice, cellW, cellH]);

  // Selected seat position object (across all decks so previewing another deck preserves dirty form state)
  const selectedSeatPos = useMemo(() => {
    if (!selectedSeatLabel) return null;
    for (const d of vessel.decks) {
      const found = d.seats.find((s) => s.label === selectedSeatLabel);
      if (found) return found;
    }
    return null;
  }, [selectedSeatLabel, vessel.decks]);

  // Notify parent of selected seat changes for dirty-form checking
  useEffect(() => {
    onSelectedSeatChange?.(selectedSeatPos);
  }, [selectedSeatPos, onSelectedSeatChange]);

  // Available seats count on this deck
  const availableCount = useMemo(() => {
    return projectedSeats.filter((s) => s.status === "available").length;
  }, [projectedSeats]);

  // Smooth deck switching reveal transition (deliberate in-and-out crossfade)
  const handleSwitchDeck = (newDeckId: string) => {
    if (newDeckId === activeDeckId || deckTransitioning) return;
    setDeckTransitioning(true);
    setTimeout(() => {
      setActiveDeckId(newDeckId);
      setSelectedSeatLabel(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      setTimeout(() => {
        setDeckTransitioning(false);
      }, 50);
    }, 280);
  };

  // Precision zoom handlers (100% - 250% range)
  const handleZoomIn = () => {
    setZoom((curr) => {
      const next = Math.min(MAX_ZOOM, +(curr + 0.25).toFixed(2));
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  };

  const handleZoomOut = () => {
    setZoom((curr) => {
      const next = Math.max(MIN_ZOOM, +(curr - 0.25).toFixed(2));
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  };

  // Reset view to 100% overview
  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Wheel zoom: smoothly zoom between 100% and 250%
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((curr) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(curr + step).toFixed(2)));
      setPan((p) => clampPan(p.x, p.y, next));
      return next;
    });
  }, []);

  // Drag pan handlers with smooth direct translation (no spring compensation)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || zoom <= 1.02) return;
    setIsPanning(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1.02) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const rawX = panStartRef.current.x + dx;
    const rawY = panStartRef.current.y + dy;
    setPan(clampPan(rawX, rawY, zoom));
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Automatically zoom in and center the clicked seat
  const handleSelectSeat = (seatPos: SeatPosition) => {
    if (selectedSeatLabel === seatPos.label) {
      setSelectedSeatLabel(null);
      setZoom(1.0);
      setPan({ x: 0, y: 0 });
      return;
    }

    setSelectedSeatLabel(seatPos.label);

    const targetZoom = 2.5;
    setZoom(targetZoom);

    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const vpW = rect.width;
      const vpH = rect.height;

      const scaleSvg = Math.min(vpW / viewBox.width, vpH / viewBox.height);
      const iso = gridToIso(seatPos.col, seatPos.row, cellW, cellH);

      const vbCenterX = viewBox.minX + viewBox.width / 2;
      const vbCenterY = viewBox.minY + viewBox.height / 2;

      const deltaSvgX = iso.x - vbCenterX;
      const deltaSvgY = iso.y - vbCenterY;

      const targetPanX = -deltaSvgX * scaleSvg * targetZoom;
      const targetPanY = -deltaSvgY * scaleSvg * targetZoom;

      setPan(clampPan(targetPanX, targetPanY, targetZoom));
    }
  };

  // Keyboard navigation: Escape key returns to map or closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col lg:flex-row bg-[#F8FAFC] overflow-hidden select-none outline-none"
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label={`${vessel.name} 3D Cabin Seating`}
    >
      {/* ─── LEFT: Vessel & Booking Information Sidebar ─── */}
      <VesselSidebar
        selectedSeat={selectedSeatPos}
        deck={activeDeck}
        vesselName={vessel.name}
        routeText={routeText}
        originName={originName}
        destName={destName}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        duration={duration}
        travelDate={travelDate}
        basePrice={basePrice}
        businessPrice={businessPrice}
        availableCount={availableCount}
        isTransitioning={deckTransitioning}
        onConfirmBooking={(seat, totalPrice) => {
          onConfirmSeat(seat, totalPrice);
        }}
        onClearSelection={() => {
          setSelectedSeatLabel(null);
          setZoom(1.0);
          setPan({ x: 0, y: 0 });
        }}
        onClose={onClose}
      />

      {/* ─── RIGHT: Main Stage & 3D Isometric Viewport ─── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-[140px] lg:pb-0">
        {/* Stage Top Bar: Title & Deck Switcher */}
        <header className="px-3 sm:px-5 py-2 sm:py-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2 sm:gap-4 shrink-0 shadow-2xs z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              title="Return"
              aria-label="Return"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight truncate">
                Tap an available seat to select
              </h2>
            </div>
          </div>

          {/* Deck Switcher Toggle: Labeled "Economy Class" and "Business Class" */}
          <div className="flex items-center bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200 shrink-0">
            {vessel.decks.map((deck) => {
              const isActive = deck.id === activeDeckId;
              const isBiz = deck.class === "business" || deck.id.includes("business");
              const tabLabel = isBiz ? "Business Class" : "Economy Class";

              return (
                <button
                  key={deck.id}
                  type="button"
                  onClick={() => handleSwitchDeck(deck.id)}
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 sm:gap-1.5 ${isActive
                      ? tabLabel === "Business Class"
                        ? "bg-white text-[#b48324] shadow-xs border border-[#ecdcb8]"
                        : "bg-white text-blue-600 shadow-xs border border-slate-200/60"
                      : tabLabel === "Business Class"
                        ? "text-[#b48324]/80 hover:text-[#b48324]"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  <Layers size={13} className={tabLabel === "Business Class" ? "text-[#b48324]" : undefined} />
                  <span className={tabLabel === "Business Class" ? "text-[#b48324] font-black" : ""}>{tabLabel}</span>
                </button>
              );
            })}
          </div>
        </header>

        {/* ─── 3D Viewport Area with Oceanic Blue Bottom Gradient ─── */}
        <div
          ref={viewportRef}
          className={`relative flex-1 w-full h-full overflow-hidden bg-gradient-to-b from-[#F8FAFC] via-[#F1F6FB] to-[#DCEAF8] ${isPanning ? "cursor-grabbing" : "cursor-grab"
            }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Subtle light background dot grid */}
          <div className="absolute inset-0 pointer-events-none opacity-35 bg-[radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Smooth oceanic blue glow gradient at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-96 pointer-events-none bg-gradient-to-t from-sky-200/50 via-blue-100/25 to-transparent" />

          {/* Floating Zoom Controls: 100% to 250% Range */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl p-0.5 sm:p-1 shadow-md scale-90 sm:scale-100 origin-top-right">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut size={15} />
            </button>

            <span className="px-2.5 text-xs font-mono font-black text-slate-800 select-none min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              title="Zoom in (+)"
              aria-label="Zoom in"
            >
              <ZoomIn size={15} />
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleResetView}
              className="px-2.5 h-8 rounded-xl flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100 transition-colors cursor-pointer"
              title="Reset to 100% Overview"
              aria-label="Reset view to 100%"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>

          {/* Floating Cabin Legend (Bottom Left of Stage) */}
          <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-4 px-4 py-2 bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-2xl text-xs font-semibold text-slate-700 shadow-md">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-white border border-slate-300 shadow-2xs" />
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 border border-blue-700 shadow-2xs" />
              <span className="text-blue-600 font-bold">Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-red-500 border border-red-600 shadow-2xs" />
              <span className="text-red-600 font-bold">Occupied</span>
            </div>
          </div>

          {/* SVG Isometric Canvas with Smooth Reveal Transition & Static Placement */}
          <svg
            ref={svgRef}
            className="w-full h-full"
            viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
            style={{
              opacity: deckTransitioning ? 0 : 1,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom * (deckTransitioning ? 0.97 : 1)})`,
              transformOrigin: "center center",
              transition: isPanning
                ? "none"
                : "transform 0.25s ease-out, opacity 0.25s ease-out",
            }}
          >
            {/* Embedded SVG reset to eliminate browser focus rectangle */}
            <defs>
              <style>{`
                g:focus, g:focus-visible, path:focus, polygon:focus, text:focus, circle:focus {
                  outline: none !important;
                  box-shadow: none !important;
                }
              `}</style>

              {/* Soft oceanic depth radial glow under the ship */}
              <radialGradient id="ocean-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.22" />
                <stop offset="60%" stopColor="#60A5FA" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#93C5FD" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ambient maritime water aura */}
            <ellipse
              cx={viewBox.minX + viewBox.width * 0.5}
              cy={viewBox.minY + viewBox.height * 0.52}
              rx={viewBox.width * 0.52}
              ry={viewBox.height * 0.35}
              fill="url(#ocean-glow)"
              pointerEvents="none"
            />

            {/* 1. Curved Hull & Symmetrical Deck Plate Layer */}
            <IsometricShipHull
              deck={activeDeck}
              category={vessel.category}
              cellW={cellW}
              cellH={cellH}
            />

            {/* 2. Isometric Seats (Painter's depth sorting) */}
            <g className="seats-layer">
              {projectedSeats.map(({ pos, screenX, screenY, status, price }) => {
                const isSelected = selectedSeatLabel === pos.label;
                return (
                  <IsometricSeat
                    key={`seat-${pos.label}`}
                    position={pos}
                    screenX={screenX}
                    screenY={screenY}
                    status={status}
                    isSelected={isSelected}
                    price={price}
                    cellW={cellW}
                    cellH={cellH}
                    onSelect={() => handleSelectSeat(pos)}
                  />
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
