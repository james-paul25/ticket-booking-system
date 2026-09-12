import { useState, useEffect } from "react";
import { Ship, ArrowRight, X, Calendar, Check, ChevronDown, ChevronUp } from "lucide-react";
import type { SeatPosition, DeckTemplate } from "@/data/vesselTemplates";

interface VesselSidebarProps {
  selectedSeat: SeatPosition | null;
  deck: DeckTemplate;
  vesselName: string;
  routeText: string;
  originName?: string;
  destName?: string;
  departureTime?: string;
  arrivalTime?: string;
  duration?: string;
  travelDate?: string;
  basePrice: number;
  businessPrice?: number;
  availableCount: number;
  isTransitioning?: boolean;
  onConfirmBooking: (seat: SeatPosition, totalPrice: number) => void;
  onClearSelection: () => void;
  onClose: () => void;
}

export function VesselSidebar({
  selectedSeat,
  deck,
  vesselName,
  routeText,
  originName,
  destName,
  departureTime = "08:00",
  arrivalTime = "10:00",
  duration = "2h 00m",
  travelDate,
  basePrice,
  businessPrice,
  availableCount,
  isTransitioning = false,
  onConfirmBooking,
  onClearSelection,
  onClose,
}: VesselSidebarProps) {
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // Auto-expand on mobile when seat is selected
  useEffect(() => {
    if (selectedSeat) {
      setIsMobileExpanded(true);
    }
  }, [selectedSeat]);

  const isBusinessDeck = deck.class === "business" || deck.id.includes("business");
  const isBusiness = selectedSeat ? selectedSeat.tier === "business" : isBusinessDeck;
  
  // Authentic MARINA fare resolution
  const effectiveBusinessFare = businessPrice ?? (basePrice >= 700 ? 1200 : Math.round(basePrice * 1.4));
  const seatFare = isBusiness ? effectiveBusinessFare : basePrice;
  const reservationFee = 25; // Standard Online Reservation Service Fee
  const totalAmount = seatFare + reservationFee;

  return (
    <aside
      className={`fixed lg:static bottom-0 left-0 right-0 z-40 w-full lg:w-96 shrink-0 bg-white border-t lg:border-t-0 lg:border-r border-slate-200 shadow-2xl lg:shadow-xl flex flex-col font-sans select-none rounded-t-[28px] lg:rounded-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden ${
        isMobileExpanded || selectedSeat
          ? "max-h-[82vh] lg:max-h-full lg:h-full"
          : "max-h-[140px] sm:max-h-[155px] lg:max-h-full lg:h-full"
      }`}
      aria-label="Trip and Seat Booking Summary"
    >
      {/* Mobile Drag Handle & Toggle Header */}
      <div
        className="w-full flex flex-col items-center pt-2 pb-0.5 lg:hidden cursor-pointer shrink-0"
        onClick={() => setIsMobileExpanded((prev) => !prev)}
      >
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto" aria-hidden="true" />
      </div>

      {/* ─── Top & Middle Sections (Structured to fit with clean internal scroll) ─── */}
      <div className="p-4 space-y-3.5 overflow-y-auto flex-1 overscroll-contain">
        {/* Top bar with vessel title and close button */}
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2.5 cursor-pointer lg:cursor-default"
            onClick={() => setIsMobileExpanded((prev) => !prev)}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Ship size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {vesselName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsMobileExpanded((prev) => !prev)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Toggle Sheet"
              aria-label="Toggle Sheet"
            >
              {isMobileExpanded || selectedSeat ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close seat selection"
              aria-label="Close seat selection"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── Outbound Sailing Card (Minimalist schedule style from Photo 2 with slashed-zero font-mono) ─── */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>OUTBOUND</span>
            <span className="text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md font-semibold font-mono normal-case">
              {duration}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-black font-mono text-slate-950 leading-tight tracking-tight slashed-zero">
                {departureTime}
              </div>
              <div className="text-xs font-semibold text-slate-500 truncate max-w-[110px]">
                {originName || routeText.split("→")[0]?.trim() || "Departure"}
              </div>
            </div>

            <div className="flex flex-col items-center px-2">
              <div className="w-12 h-px bg-slate-300 relative flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600 absolute" />
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-black font-mono text-slate-950 leading-tight tracking-tight slashed-zero">
                {arrivalTime}
              </div>
              <div className="text-xs font-semibold text-slate-500 truncate max-w-[110px]">
                {destName || routeText.split("→")[1]?.trim() || "Arrival"}
              </div>
            </div>
          </div>

          {travelDate && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-200/60 font-mono slashed-zero">
              <Calendar size={13} className="text-slate-400 shrink-0" />
              <span>{travelDate}</span>
            </div>
          )}
        </div>

        {/* ─── "Your seat" Selection Section (Smooth in-and-out transition) ─── */}
        <div className={`space-y-2 transition-all duration-300 ease-in-out ${isTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Your Seat
            </h4>
            {selectedSeat && (
              <button
                type="button"
                onClick={onClearSelection}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {selectedSeat ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-xs space-y-2.5">
              {/* Header line: Class tag and status indicator */}
              <div className="flex items-center justify-between">
                {selectedSeat.tier === "business" ? (
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#b48324] bg-[#fdf8ee] border border-[#ecdcb8] px-2 py-0.5 rounded-md font-mono">
                    Business Class
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md font-mono">
                    Economy Class
                  </span>
                )}
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Check size={12} className="stroke-[2.5]" />
                  <span>Selected</span>
                </span>
              </div>

              {/* Main Seat Row: Bold seat number + Voyage Fare */}
              <div className="flex items-baseline justify-between pt-0.5">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SEAT NUMBER
                  </div>
                  <div className="text-3xl font-black text-slate-950 tracking-tight leading-none mt-1 font-mono slashed-zero">
                    {selectedSeat.label}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    VOYAGE FARE
                  </div>
                  <div className="text-xl font-black text-slate-950 tracking-tight leading-none mt-1 font-mono slashed-zero">
                    ₱{seatFare.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Seat Details metadata strip */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  {selectedSeat.isWindow ? "Window Side View" : "Direct Aisle Access"}
                </span>
                <span className="text-slate-400">
                  {deck.name} • Row <strong className="font-mono slashed-zero">{selectedSeat.row + 1}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-3 text-center space-y-1">
              <p className="text-xs font-bold text-slate-700">
                No Seat Selected
              </p>
              <p className="text-[11px] text-slate-400 leading-snug">
                Click any available white seat on the cabin deck.
              </p>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-mono slashed-zero">
                <span>{availableCount} seats free on {deck.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── Fare Breakdown & Authoritative Big Total Due (Smooth in-and-out transition) ─── */}
        <div className={`space-y-1.5 pt-2.5 border-t border-slate-200 transition-all duration-300 ease-in-out ${isTransitioning ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">
              Base Passenger Fare{" "}
              {selectedSeat ? (
                <span className="font-mono text-slate-700 font-bold slashed-zero">({selectedSeat.label})</span>
              ) : (
                <span className="text-slate-400 font-normal">({isBusiness ? "Business" : "Economy"})</span>
              )}
            </span>
            <span className="font-bold font-mono text-slate-900 slashed-zero">
              ₱{seatFare.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Online Seat Reservation Fee</span>
            <span className="font-bold font-mono text-slate-900 slashed-zero">₱{reservationFee}</span>
          </div>

          {/* Balanced TOTAL DUE Row: Clear, readable 'TOTAL DUE' title and disclaimer, with matched size price number */}
          <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
            <div>
              <span className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 block">
                Total Due
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-0.5">
                Includes seat reservation guarantee
              </span>
            </div>
            <div className="text-right">
              <span className="text-xl sm:text-2xl font-black font-mono text-slate-950 tracking-tight slashed-zero">
                ₱{totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Action CTA: Directly below Total Due, raised up high with zero scrolling needed ─── */}
        <div className={`pt-2 transition-all duration-300 ease-in-out ${isTransitioning ? "opacity-40" : "opacity-100"}`}>
          <button
            type="button"
            disabled={!selectedSeat}
            onClick={() => {
              if (selectedSeat) onConfirmBooking(selectedSeat, totalAmount);
            }}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs tracking-wide flex items-center justify-center gap-2 shadow-md transition-all duration-200 ${
              selectedSeat
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/25 cursor-pointer transform hover:-translate-y-0.5"
                : "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            <span>Continue to Payment</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
