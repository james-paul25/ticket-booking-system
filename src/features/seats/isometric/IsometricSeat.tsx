import { useMemo } from "react";
import type { SeatPosition } from "@/data/vesselTemplates";
import type { SeatStatus } from "@/types/database";
import { isoBoxFaces } from "./isoMath";

// ────────────────────────────────────────────
// Seat color tokens
// - Available: Crisp porcelain white
// - Selected: Deep royal blue
// - Occupied / Booked: Clean vivid red
// ────────────────────────────────────────────

const SEAT_COLORS = {
  available: {
    top: "#FFFFFF",
    front: "#F1F5F9",
    side: "#E2E8F0",
    stroke: "#CBD5E1",
    backrestTop: "#F8FAFC",
    backrestFront: "#F1F5F9",
    backrestSide: "#E2E8F0",
    label: "#334155",
    hoverTop: "#EFF6FF",
    hoverFront: "#DBEAFE",
    hoverSide: "#BFDBFE",
  },
  selected: {
    top: "#3B82F6",
    front: "#2563EB",
    side: "#1D4ED8",
    stroke: "#1E40AF",
    backrestTop: "#60A5FA",
    backrestFront: "#3B82F6",
    backrestSide: "#2563EB",
    label: "#FFFFFF",
    hoverTop: "#2563EB",
    hoverFront: "#1D4ED8",
    hoverSide: "#1E40AF",
  },
  booked: {
    top: "#F87171",       // red-400
    front: "#EF4444",     // red-500
    side: "#DC2626",      // red-600
    stroke: "#B91C1C",    // red-700
    backrestTop: "#FCA5A5", // red-300
    backrestFront: "#F87171",
    backrestSide: "#EF4444",
    label: "#FFFFFF",
    hoverTop: "#F87171",
    hoverFront: "#EF4444",
    hoverSide: "#DC2626",
  },
  reserved: {
    top: "#FCD34D",
    front: "#F59E0B",
    side: "#D97706",
    stroke: "#B45309",
    backrestTop: "#FDE68A",
    backrestFront: "#FCD34D",
    backrestSide: "#F59E0B",
    label: "#78350F",
    hoverTop: "#FCD34D",
    hoverFront: "#F59E0B",
    hoverSide: "#D97706",
  },
  blocked: {
    top: "#F1F5F9",
    front: "#E2E8F0",
    side: "#CBD5E1",
    stroke: "#CBD5E1",
    backrestTop: "#E2E8F0",
    backrestFront: "#CBD5E1",
    backrestSide: "#94A3B8",
    label: "#94A3B8",
    hoverTop: "#F1F5F9",
    hoverFront: "#E2E8F0",
    hoverSide: "#CBD5E1",
  },
} as const;

const BUSINESS_SEAT_SCALE = 1.15;
const ISO_ANGLE = Math.atan(0.5);
const COS_A = Math.cos(ISO_ANGLE);
const SIN_A = Math.sin(ISO_ANGLE);

interface IsometricSeatProps {
  position: SeatPosition;
  screenX: number;
  screenY: number;
  status: SeatStatus;
  isSelected: boolean;
  price: number;
  onSelect: (label: string) => void;
  cellW?: number;
  cellH?: number;
}

export function IsometricSeat({
  position,
  screenX,
  screenY,
  status,
  isSelected,
  price,
  onSelect,
  cellW = 41,
  cellH = 56,
}: IsometricSeatProps) {
  const isAvailable = status === "available";
  const isBusiness = position.tier === "business";
  const scale = isBusiness ? BUSINESS_SEAT_SCALE : 1;

  // Ergonomic Seat Proportions (tighter side-to-side gap ~10px, preserved front-to-back 56px pitch & 31px depth)
  const boxW = Math.round(cellW * 0.75 * scale); // 31px wide
  const boxD = Math.round(cellH * 0.55 * scale); // 31px depth (front-to-back unchanged)
  const seatH = 7 * scale;          // Slim cushion base
  const backrestH = 18 * scale;     // Taller executive backrest

  const colorKey = isSelected
    ? "selected"
    : status === "available"
    ? "available"
    : status === "reserved"
    ? "reserved"
    : status === "blocked"
    ? "blocked"
    : "booked";

  const colors = SEAT_COLORS[colorKey];

  // Compute face polygons centered on (screenX, screenY)
  const faces = useMemo(() => {
    // 1. Shift origin so the cushion is perfectly centered on (screenX, screenY)
    const originX = screenX - (boxW - boxD) * COS_A * 0.5;
    const originY = screenY - (boxW + boxD) * SIN_A * 0.5;

    const cushion = isoBoxFaces(originX, originY, boxW, boxD, seatH);

    // 2. Wide ergonomic backrest sitting on the rear edge of the cushion
    const brW = boxW * 0.94;
    const brD = boxD * 0.22;
    const brOriginX = originX + (boxW - brW) * COS_A * 0.5;
    const brOriginY = originY + (boxW - brW) * SIN_A * 0.5;

    const backrest = isoBoxFaces(brOriginX, brOriginY - seatH, brW, brD, backrestH);

    return { cushion, backrest };
  }, [screenX, screenY, boxW, boxD, seatH, backrestH]);

  const handleClick = () => {
    if (isAvailable) {
      onSelect(position.label);
    }
  };

  const cursor = isAvailable ? "pointer" : "default";
  const opacity = status === "blocked" ? 0.4 : 1;

  return (
    <g
      role={isAvailable ? "button" : undefined}
      aria-label={
        isAvailable
          ? `Seat ${position.label}, ${position.isWindow ? "window" : "aisle"}, ₱${price}`
          : `Seat ${position.label}, ${status}`
      }
      tabIndex={isAvailable ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isAvailable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect(position.label);
        }
      }}
      style={{
        cursor,
        opacity,
        outline: "none",
        border: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      className={`group outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
        isAvailable ? "cursor-pointer" : ""
      }`}
    >
      {/* ─── A. Floor Ground Halo (Anchor on Deck) ─── */}
      {isSelected && (
        <g pointerEvents="none">
          {/* Glowing floor halo */}
          <ellipse
            cx={screenX}
            cy={screenY}
            rx={boxW * 0.72}
            ry={boxD * 0.36}
            fill="#2563EB"
            opacity={0.25}
          />
          {/* Static crisp ground ring */}
          <ellipse
            cx={screenX}
            cy={screenY}
            rx={boxW * 0.82}
            ry={boxD * 0.41}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={1.4}
            opacity={0.7}
          />
        </g>
      )}

      {/* ─── B. Physical 3D Seat Geometry (Stable lift when selected) ─── */}
      <g
        transform={isSelected ? "translate(0, -4)" : "translate(0, 0)"}
        style={{
          transition: "transform 0.15s ease-out",
        }}
      >
        {/* 1. Cushion Base: Side face */}
        <polygon
          points={faces.cushion.side}
          fill={colors.side}
          stroke={colors.stroke}
          strokeWidth={0.7}
          strokeLinejoin="round"
        />

        {/* 2. Cushion Base: Front face */}
        <polygon
          points={faces.cushion.front}
          fill={colors.front}
          stroke={colors.stroke}
          strokeWidth={0.7}
          strokeLinejoin="round"
        />

        {/* 3. Cushion Base: Top surface */}
        <polygon
          points={faces.cushion.top}
          fill={colors.top}
          stroke={colors.stroke}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        {/* 4. Ergonomic High-Backrest: Side face */}
        <polygon
          points={faces.backrest.side}
          fill={colors.backrestSide}
          stroke={colors.stroke}
          strokeWidth={0.7}
          strokeLinejoin="round"
        />

        {/* 5. Ergonomic High-Backrest: Front face */}
        <polygon
          points={faces.backrest.front}
          fill={colors.backrestFront}
          stroke={colors.stroke}
          strokeWidth={0.7}
          strokeLinejoin="round"
        />

        {/* 6. Ergonomic High-Backrest: Top / Headrest cushion */}
        <polygon
          points={faces.backrest.top}
          fill={colors.backrestTop}
          stroke={colors.stroke}
          strokeWidth={0.8}
          strokeLinejoin="round"
        />

        {/* 7. Perfectly Centered Seat Label on Cushion */}
        <text
          x={screenX}
          y={screenY - seatH}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colors.label}
          fontSize={isBusiness ? 8.5 : 8}
          fontWeight={700}
          fontFamily="ui-monospace, 'SF Mono', 'Cascadia Mono', Consolas, monospace"
          style={{ pointerEvents: "none", userSelect: "none" }}
        >
          {position.label}
        </text>

        {/* ─── C. Floating Selection Pin Badge (Mondaysys style) ─── */}
        {isSelected && (
          <g pointerEvents="none">
            {/* Dashed vertical pin tether line */}
            <line
              x1={screenX}
              y1={screenY - seatH - backrestH}
              x2={screenX}
              y2={screenY - seatH - backrestH - 12}
              stroke="#2563EB"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
            {/* Small tether circle at headrest */}
            <circle
              cx={screenX}
              cy={screenY - seatH - backrestH}
              r={2}
              fill="#2563EB"
            />
            {/* Floating pill badge */}
            <g transform={`translate(${screenX}, ${screenY - seatH - backrestH - 22})`}>
              {/* Pill shadow */}
              <rect
                x={-26}
                y={-10}
                width={52}
                height={20}
                rx={10}
                fill="#1E40AF"
                opacity={0.3}
                transform="translate(0, 3)"
              />
              {/* Pill body */}
              <rect
                x={-26}
                y={-10}
                width={52}
                height={20}
                rx={10}
                fill="#2563EB"
                stroke="#93C5FD"
                strokeWidth={1.2}
              />
              {/* Badge text */}
              <text
                x={0}
                y={0.5}
                fill="#FFFFFF"
                fontSize={8.5}
                fontWeight={800}
                fontFamily="system-ui, -apple-system, sans-serif"
                textAnchor="middle"
                dominantBaseline="central"
                letterSpacing="0.04em"
              >
                ✓ {position.label}
              </text>
            </g>
          </g>
        )}
      </g>
    </g>
  );
}
