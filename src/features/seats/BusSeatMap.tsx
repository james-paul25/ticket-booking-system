import type { Seat } from "@/types/seat";
import { BusChassis } from "./bus/BusChassis";
import { BusVectorSeat } from "./bus/BusVectorSeat";

interface BusSeatMapProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelect: (seat: Seat) => void;
  vehicleName?: string;
  vehicleNumber?: string;
}

export function BusSeatMap({
  seats,
  selectedSeatId,
  onSelect,
}: BusSeatMapProps) {
  const sortedSeats = [...seats].sort((a, b) => {
    return a.seat_number.localeCompare(b.seat_number, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const getSeatByNumber = (num: number): { seat: Seat | null; label: string } => {
    const label = `A${num}`;
    const directMatch = seats.find(
      (s) =>
        s.seat_number === label ||
        s.seat_number === `${num}` ||
        s.seat_number === `B${num}` ||
        s.seat_number === `C${num}` ||
        s.seat_number === `D${num}`
    );
    if (directMatch) return { seat: directMatch, label: directMatch.seat_number };
    const fallback = sortedSeats[num - 1] ?? null;
    return { seat: fallback, label: fallback ? fallback.seat_number : `${num}` };
  };

  const renderSeatSlot = (num: number) => {
    const { seat, label } = getSeatByNumber(num);
    return (
      <BusVectorSeat
        seat={seat}
        isSelected={seat ? seat.id === selectedSeatId : false}
        onSelect={onSelect}
        label={label}
      />
    );
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-4 select-none animate-fade-in">
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

      <BusChassis>
        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          <BusVectorSeat isDriver />
          <div className="w-9 h-10 sm:w-10 sm:h-11" />
          <div className="w-3" />
          {renderSeatSlot(1)}
          {renderSeatSlot(2)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(3)}
          {renderSeatSlot(4)}
          <div className="w-3" />
          {renderSeatSlot(5)}
          {renderSeatSlot(6)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(7)}
          {renderSeatSlot(8)}
          <div className="w-3" />
          {renderSeatSlot(9)}
          {renderSeatSlot(10)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(11)}
          {renderSeatSlot(12)}
          <div className="w-3" />
          {renderSeatSlot(13)}
          {renderSeatSlot(14)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(15)}
          {renderSeatSlot(16)}
          <div className="w-3" />
          {renderSeatSlot(17)}
          {renderSeatSlot(18)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(19)}
          {renderSeatSlot(20)}
          <div className="w-3" />
          {renderSeatSlot(21)}
          {renderSeatSlot(22)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(23)}
          {renderSeatSlot(24)}
          <div className="w-3" />
          <div className="w-9 h-10 sm:w-10 sm:h-11" />
          <div className="w-9 h-10 sm:w-10 sm:h-11" />
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(25)}
          {renderSeatSlot(26)}
          <div className="w-3" />
          {renderSeatSlot(27)}
          {renderSeatSlot(28)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(29)}
          {renderSeatSlot(30)}
          <div className="w-3" />
          {renderSeatSlot(31)}
          {renderSeatSlot(32)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(33)}
          {renderSeatSlot(34)}
          <div className="w-3" />
          {renderSeatSlot(35)}
          {renderSeatSlot(36)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(37)}
          {renderSeatSlot(38)}
          <div className="w-3" />
          {renderSeatSlot(39)}
          {renderSeatSlot(40)}
        </div>

        <div className="grid grid-cols-5 gap-1.5 items-center justify-items-center w-full max-w-[245px] sm:max-w-[270px] mx-auto">
          {renderSeatSlot(41)}
          {renderSeatSlot(42)}
          {renderSeatSlot(43)}
          {renderSeatSlot(44)}
          {renderSeatSlot(45)}
        </div>

        <div className="mx-auto flex items-center justify-center select-none pt-0.5">
          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Rear
          </span>
        </div>
      </BusChassis>
    </div>
  );
}
