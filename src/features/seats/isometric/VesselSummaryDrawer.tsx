import { X, ArrowRight } from "lucide-react";
import type { SeatPosition, DeckTemplate } from "@/data/vesselTemplates";

interface VesselSummaryDrawerProps {
  selectedSeat: SeatPosition | null;
  deck: DeckTemplate;
  vesselName: string;
  routeText: string;
  departureTime?: string;
  travelDate?: string;
  basePrice: number;
  availableCount: number;
  onConfirmBooking: (seat: SeatPosition, totalPrice: number) => void;
  onClearSelection: () => void;
}

export function VesselSummaryDrawer({
  selectedSeat,
  deck,
  vesselName,
  routeText,
  departureTime,
  travelDate,
  basePrice,
  availableCount,
  onConfirmBooking,
  onClearSelection,
}: VesselSummaryDrawerProps) {
  const isBusiness = selectedSeat?.tier === "business";
  const seatMultiplier = isBusiness ? 1.45 : 1.0;
  const seatFare = Math.round(basePrice * seatMultiplier);
  const reservationFee = 25; // Online Seat Reservation Fee
  const totalAmount = seatFare + reservationFee;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 pointer-events-none p-4 md:p-6 flex justify-center"
      role="region"
      aria-label="Seat booking drawer"
    >
      <div
        className={`pointer-events-auto w-full max-w-4xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 transition-all duration-300 ease-out overflow-hidden ${
          selectedSeat
            ? "translate-y-0 opacity-100 ring-1 ring-blue-500/40"
            : "translate-y-1 opacity-90"
        }`}
      >
        {selectedSeat ? (
          <div className="p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Left: Seat info & attributes */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300">SEAT</span>
                <span className="text-xl font-black tracking-tight text-white">{selectedSeat.label}</span>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-white truncate">
                    {deck.name} • {isBusiness ? <span className="text-[#f3cb77]">Business Class</span> : "Tourist Class"}
                  </h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isBusiness
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                        : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                    }`}
                  >
                    {isBusiness ? "Premium Reclining" : "Air-Conditioned"}
                  </span>
                  {selectedSeat.isWindow && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-sky-400/15 text-sky-300 border border-sky-400/20">
                      Window View
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span>{vesselName}</span>
                  <span>•</span>
                  <span>{routeText}</span>
                  {travelDate && (
                    <>
                      <span>•</span>
                      <span>{travelDate}</span>
                    </>
                  )}
                  {departureTime && (
                    <>
                      <span>•</span>
                      <span>Departs {departureTime}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Fare breakdown & CTA */}
            <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
              <div className="text-left md:text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-400">Total Payable</div>
                <div className="text-xl font-extrabold text-emerald-400">
                  ₱{totalAmount.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500">
                  Fare ₱{seatFare} + Reservation Fee ₱{reservationFee}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClearSelection}
                  title="Deselect seat"
                  className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => onConfirmBooking(selectedSeat, totalAmount)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span>Confirm Seat</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty state guide */
          <div className="py-3 px-5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                Select an <span className="font-semibold text-emerald-400">available green seat</span> on the 3D deck to view details.
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px]">
              <span>{availableCount} seats remaining on {deck.name}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
