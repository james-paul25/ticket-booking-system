import type { Seat } from "@/types/seat";

interface SeatMapProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seat: Seat) => void;
}

const ROW_ORDER = ["A", "B", "C", "D", "E", "F"];

function groupByRow(seats: Seat[]) {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    const row = seat.seat_number.charAt(0);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row)!.push(seat);
  }
  for (const list of rows.values()) {
    list.sort((a, b) => Number(a.seat_number.slice(1)) - Number(b.seat_number.slice(1)));
  }
  return [...rows.entries()].sort(
    (a, b) => ROW_ORDER.indexOf(a[0]) - ROW_ORDER.indexOf(b[0]) || a[0].localeCompare(b[0])
  );
}

const SEAT_STYLES: Record<string, string> = {
  available:
    "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-brand-500 cursor-pointer",
  reserved: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 cursor-not-allowed opacity-70",
  booked: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-800 cursor-not-allowed opacity-70",
  blocked: "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700 cursor-not-allowed opacity-60",
};

export function SeatMap({ seats, selectedSeatId, onSelect }: SeatMapProps) {
  const rows = groupByRow(seats);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <LegendDot className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700" label="Available" />
        <LegendDot className="bg-brand-600" label="Selected" />
        <LegendDot className="bg-red-200 dark:bg-red-900/40" label="Booked" />
        <LegendDot className="bg-slate-200 dark:bg-slate-800" label="Blocked" />
      </div>

      <div className="inline-flex flex-col gap-2 mx-auto">
        {rows.map(([row, rowSeats]) => (
          <div key={row} className="flex items-center gap-2">
            <span className="w-4 text-xs text-slate-400">{row}</span>
            <div className="flex gap-2">
              {rowSeats.map((seat) => {
                const isSelected = seat.id === selectedSeatId;
                const disabled = seat.status !== "available";
                return (
                  <button
                    key={seat.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(seat)}
                    aria-label={`Seat ${seat.seat_number} (${seat.status})`}
                    className={`h-10 w-10 sm:h-11 sm:w-11 rounded-lg border text-xs font-medium flex items-center justify-center transition-colors ${
                      isSelected ? "bg-brand-600 border-brand-600 text-white" : SEAT_STYLES[seat.status]
                    }`}
                  >
                    {seat.seat_number}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${className}`} />
      {label}
    </div>
  );
}
