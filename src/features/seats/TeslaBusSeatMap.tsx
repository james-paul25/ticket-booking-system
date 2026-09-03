import { useState } from "react";
import { Disc, Check, ChevronUp } from "lucide-react";
import type { Seat } from "@/types/seat";

interface TeslaBusSeatMapProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seat: Seat) => void;
  vehicleName?: string;
  vehicleNumber?: string;
}

export function TeslaBusSeatMap({
  seats,
  selectedSeatId,
  onSelect,
  vehicleName,
  vehicleNumber,
}: TeslaBusSeatMapProps) {
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);

  const rowMap = new Map<string, Seat[]>();
  for (const seat of seats) {
    const rowChar = seat.seat_number.charAt(0);
    if (!rowMap.has(rowChar)) {
      rowMap.set(rowChar, []);
    }
    rowMap.get(rowChar)!.push(seat);
  }

  const sortedRows = [...rowMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  for (const [, list] of sortedRows) {
    list.sort((a, b) => {
      const numA = parseInt(a.seat_number.slice(1), 10) || 0;
      const numB = parseInt(b.seat_number.slice(1), 10) || 0;
      return numA - numB;
    });
  }

  function handleSeatClick(seat: Seat) {
    if (seat.status !== "available") return;
    setActiveSeatId(seat.id);
    setTimeout(() => setActiveSeatId(null), 250);
    onSelect(seat);
  }

  return (
    <div className="flex flex-col items-center select-none w-full animate-fade-in">
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mb-6 bg-slate-900/90 py-2.5 px-5 rounded-2xl border border-slate-800/90 shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md border border-slate-700 bg-slate-800/90" />
          <span className="text-slate-300">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] border border-cyan-200" />
          <span className="font-semibold text-cyan-400">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-md bg-slate-800/40 border border-slate-800/80 flex items-center justify-center text-[9px] text-slate-600">
            ✕
          </div>
          <span className="text-slate-500">Occupied</span>
        </div>
      </div>

      <div className="relative w-full max-w-[340px] sm:max-w-[390px] bg-slate-950 rounded-t-[3.8rem] rounded-b-[2.6rem] p-4 sm:p-5 border-2 border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.08)]">
        <div className="absolute -left-2.5 top-14 w-2 h-8 rounded-l-md bg-slate-800 border-l border-y border-cyan-500/20 shadow-sm" />
        <div className="absolute -right-2.5 top-14 w-2 h-8 rounded-r-md bg-slate-800 border-r border-y border-cyan-500/20 shadow-sm" />

        <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-900/80 to-slate-950 rounded-t-[3.2rem] rounded-b-2xl p-4 mb-6 border border-slate-800/90 shadow-inner overflow-hidden">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-52 h-24 bg-cyan-500/10 blur-2xl rounded-full pointer-events-none" />

          <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
              <span className="text-[11px] font-bold tracking-widest text-slate-200 uppercase">
                {vehicleName ?? "Transit Express"}
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-wider text-cyan-400/80 px-2 py-0.5 rounded-md bg-slate-950/80 border border-cyan-900/40">
              {vehicleNumber ?? "VEHICLE-01"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 items-center pt-3.5 px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-300 shadow-md">
                <Disc size={20} className="text-cyan-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-slate-300 tracking-wide">
                  (Driver)
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-mono">
                  Cockpit
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="flex flex-col items-end px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/60">
                <div className="flex items-center gap-1 text-cyan-400">
                  <span className="text-[10px] uppercase font-bold tracking-widest">
                    Entry Gateway
                  </span>
                  <ChevronUp size={12} className="animate-bounce" />
                </div>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-mono">
                  Boarding Door
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-1 sm:px-2">
          {sortedRows.map(([rowChar, rowSeats]) => {
            const leftSeats = rowSeats.filter((_, idx) => idx < Math.ceil(rowSeats.length / 2));
            const rightSeats = rowSeats.filter((_, idx) => idx >= Math.ceil(rowSeats.length / 2));

            return (
              <div key={rowChar} className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  {leftSeats.map((seat) => (
                    <TeslaBucketSeat
                      key={seat.id}
                      seat={seat}
                      isSelected={seat.id === selectedSeatId}
                      isActive={seat.id === activeSeatId}
                      onClick={() => handleSeatClick(seat)}
                    />
                  ))}
                </div>

                <div className="flex flex-col items-center justify-center min-w-[28px] py-1">
                  <span className="text-[10px] font-black font-mono text-cyan-500/70 uppercase tracking-widest">
                    {rowChar}
                  </span>
                  <div className="w-0.5 h-3 bg-cyan-950/80 rounded-full my-0.5 border-l border-cyan-500/20" />
                </div>

                <div className="flex items-center gap-2.5">
                  {rightSeats.map((seat) => (
                    <TeslaBucketSeat
                      key={seat.id}
                      seat={seat}
                      isSelected={seat.id === selectedSeatId}
                      isActive={seat.id === activeSeatId}
                      onClick={() => handleSeatClick(seat)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-3 border-t border-slate-800/80 text-center">
          <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 text-[10px] font-mono uppercase tracking-widest text-slate-500 border border-slate-800">
            Rear Section · Cargo Deck
          </div>
        </div>

        <div className="flex justify-between items-center px-6 pt-3">
          <div className="w-8 h-1.5 rounded-full bg-rose-500/90 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
          <div className="w-8 h-1.5 rounded-full bg-rose-500/90 shadow-[0_0_10px_rgba(244,63,94,0.7)]" />
        </div>
      </div>
    </div>
  );
}

interface TeslaBucketSeatProps {
  seat: Seat;
  isSelected: boolean;
  isActive: boolean;
  onClick: () => void;
}

function TeslaBucketSeat({ seat, isSelected, isActive, onClick }: TeslaBucketSeatProps) {
  const isAvailable = seat.status === "available";
  const isBooked = seat.status === "booked" || seat.status === "reserved";
  const isBlocked = seat.status === "blocked";

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={onClick}
      aria-label={`Seat ${seat.seat_number} (${seat.status})`}
      className={`relative group w-12 h-14 sm:w-14 sm:h-16 rounded-2xl flex flex-col items-center justify-between p-1.5 transition-all duration-200 ${
        isSelected
          ? "bg-gradient-to-b from-cyan-400 to-cyan-600 text-slate-950 shadow-[0_0_24px_rgba(6,182,212,0.9)] scale-[1.08] ring-2 ring-cyan-200"
          : isAvailable
          ? "bg-slate-900/90 hover:bg-slate-850 text-slate-200 border border-slate-700/80 hover:border-cyan-400/80 hover:shadow-[0_0_15px_rgba(6,182,212,0.25)] hover:scale-105 active:scale-95"
          : isBooked
          ? "bg-slate-950 text-slate-600 border border-slate-850 cursor-not-allowed opacity-45"
          : "bg-slate-950 text-slate-700 border border-dashed border-slate-800 cursor-not-allowed opacity-35"
      } ${isActive ? "scale-95" : ""}`}
    >
      <div
        className={`w-6 sm:w-7 h-2 rounded-t-md transition-colors ${
          isSelected
            ? "bg-white shadow-sm"
            : isAvailable
            ? "bg-slate-700 group-hover:bg-cyan-400/80"
            : "bg-slate-800/60"
        }`}
      />

      <div className="flex items-center justify-center my-auto">
        {isSelected ? (
          <Check size={16} strokeWidth={3.5} className="text-slate-950 animate-fade-in" />
        ) : isBooked ? (
          <span className="text-[10px] font-bold text-slate-600">✕</span>
        ) : isBlocked ? (
          <span className="text-[9px] font-bold text-slate-700">―</span>
        ) : (
          <span className="text-xs font-black font-mono tracking-tight group-hover:text-cyan-300">
            {seat.seat_number}
          </span>
        )}
      </div>

      <div
        className={`w-full h-1.5 rounded-b-sm transition-colors ${
          isSelected
            ? "bg-cyan-200/80"
            : isAvailable
            ? "bg-slate-800 group-hover:bg-cyan-500/30"
            : "bg-transparent"
        }`}
      />
    </button>
  );
}
