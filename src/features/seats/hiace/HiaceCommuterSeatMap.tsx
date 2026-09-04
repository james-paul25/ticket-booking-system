import type { Seat } from "@/types/seat";
import { HiaceChassis } from "./HiaceChassis";
import { HiaceVectorSeat } from "./HiaceVectorSeat";

interface HiaceCommuterSeatMapProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seat: Seat) => void;
  vehicleName?: string;
  vehicleNumber?: string;
}

export function HiaceCommuterSeatMap({
  seats,
  selectedSeatId,
  onSelect,
}: HiaceCommuterSeatMapProps) {
  const sortedSeats = [...seats].sort((a, b) => {
    return a.seat_number.localeCompare(b.seat_number, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const getSeatByNumber = (num: number): { seat: Seat | null; label: string } => {
    const label = `A${num}`;
    const directMatch = seats.find((s) => s.seat_number === label);
    if (directMatch) return { seat: directMatch, label };
    const fallback = sortedSeats[num - 1] ?? null;
    return { seat: fallback, label };
  };

  const renderSeatSlot = (num: number, isJump = false) => {
    const { seat, label } = getSeatByNumber(num);
    return (
      <HiaceVectorSeat
        seat={seat}
        isSelected={seat ? seat.id === selectedSeatId : false}
        onSelect={onSelect}
        label={label}
        isJumpSeat={isJump}
      />
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto space-y-4 select-none animate-fade-in">

      <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs select-none">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100" />
          <span className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">Available</span>
        </div>
        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-green-600 border border-green-700 shadow-sm" />
          <span className="text-green-600 dark:text-green-400 font-bold text-[11px]">Selected</span>
        </div>
        <div className="w-px h-3 bg-slate-200 dark:bg-slate-700" />
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded bg-red-600 border border-red-700 shadow-sm" />
          <span className="text-red-600 dark:text-red-400 font-bold text-[11px]">Booked</span>
        </div>
      </div>

      <HiaceChassis>
        <div className="grid grid-cols-4 gap-1.5 items-center w-full">
          <div className="flex justify-center">
            <HiaceVectorSeat isDriver />
          </div>
          <div className="col-span-2 flex justify-center">
            {renderSeatSlot(1)}
          </div>
          <div className="flex justify-center">
            {renderSeatSlot(2)}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 justify-items-center w-full">
          {renderSeatSlot(3)}
          {renderSeatSlot(4)}
          {renderSeatSlot(5)}
          <div className="w-10 h-11" />
        </div>

        <div className="grid grid-cols-4 gap-1.5 justify-items-center w-full">
          {renderSeatSlot(6)}
          {renderSeatSlot(7)}
          <div className="w-10 h-11" />
          {renderSeatSlot(8)}
        </div>

        <div className="grid grid-cols-4 gap-1.5 justify-items-center w-full">
          {renderSeatSlot(9)}
          {renderSeatSlot(10)}
          <div className="w-10 h-11" />
          {renderSeatSlot(11)}
        </div>

        <div className="grid grid-cols-4 gap-1.5 justify-items-center w-full">
          {renderSeatSlot(12)}
          {renderSeatSlot(13)}
          {renderSeatSlot(14)}
          {renderSeatSlot(15)}
        </div>

        <div className="w-24 sm:w-28 mx-auto pt-1 border-t-2 border-slate-300 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1 rounded-sm bg-slate-400" />
          <span className="text-[7.5px] font-bold uppercase tracking-wider text-slate-400">
            Rear Door
          </span>
          <div className="w-1.5 h-1 rounded-sm bg-slate-400" />
        </div>
      </HiaceChassis>
    </div>
  );
}
