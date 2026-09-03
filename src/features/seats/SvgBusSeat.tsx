import type { Seat } from "@/types/seat";

interface SvgBusSeatProps {
  seat: Seat;
  isSelected: boolean;
  onSelect: (seat: Seat) => void;
}

export function SvgBusSeat({ seat, isSelected, onSelect }: SvgBusSeatProps) {
  const isAvailable = seat.status === "available";
  const isBooked = seat.status === "booked" || seat.status === "reserved";

  let fillClass = "fill-slate-100 dark:fill-slate-800/90";
  let strokeClass = "stroke-slate-400 dark:stroke-slate-600";
  let textClass = "text-slate-700 dark:text-slate-200";

  if (isSelected) {
    fillClass = "fill-emerald-500 dark:fill-emerald-500";
    strokeClass = "stroke-emerald-300 dark:stroke-emerald-200";
    textClass = "text-white font-black";
  } else if (isAvailable) {
    fillClass = "fill-white dark:fill-slate-800 hover:fill-emerald-50 dark:hover:fill-emerald-950/40";
    strokeClass = "stroke-slate-400 dark:stroke-slate-600 hover:stroke-emerald-500";
    textClass = "text-slate-700 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400";
  } else if (isBooked) {
    fillClass = "fill-slate-200 dark:fill-slate-900/90";
    strokeClass = "stroke-slate-300 dark:stroke-slate-800";
    textClass = "text-slate-400 dark:text-slate-600";
  }

  return (
    <button
      type="button"
      disabled={!isAvailable}
      onClick={() => isAvailable && onSelect(seat)}
      className={`group relative flex flex-col items-center justify-center w-11 h-12 sm:w-12 sm:h-13 transition-transform duration-100 select-none ${
        isAvailable ? "cursor-pointer active:scale-95 hover:scale-105" : "cursor-not-allowed"
      } ${isSelected ? "scale-105 z-10" : ""}`}
      aria-label={`Seat ${seat.seat_number} (${seat.status})`}
      title={`Seat ${seat.seat_number} · ${seat.status}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full -rotate-90 drop-shadow-sm"
      >
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3"
          strokeMiterlimit="10"
          d="M36,17.3H80.4a8.88,8.88,0,0,1,6.72-7.25A5.77,5.77,0,0,0,81.57,6H36a5.72,5.72,0,0,0-5.76,5.66A5.71,5.71,0,0,0,36,17.3Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3"
          strokeMiterlimit="10"
          d="M80.29,82.79H36A5.66,5.66,0,1,0,36,94.1H81.47a6.13,6.13,0,0,0,5.44-3.41A8.77,8.77,0,0,1,80.29,82.79Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3"
          strokeMiterlimit="10"
          d="M80.08,79.7V20.5H35.92A8.85,8.85,0,0,1,27.17,13h-18a4,4,0,0,0-4.06,4V82.79a4,4,0,0,0,4.06,3.95H27.28a8.65,8.65,0,0,1,8.75-7Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3"
          strokeMiterlimit="10"
          d="M89.15,12.93a5.71,5.71,0,0,0-5.76,5.65V82.15a5.76,5.76,0,0,0,11.52,0V18.58A5.71,5.71,0,0,0,89.15,12.93Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3"
          strokeMiterlimit="10"
          d="M90.21,9.94a8.93,8.93,0,0,0-8.74-7H36a8.94,8.94,0,0,0-8.75,6.93H9.15A7.22,7.22,0,0,0,2,17V82.79a7.06,7.06,0,0,0,7.15,7h18a8.85,8.85,0,0,0,8.75,7.26H81.47A8.91,8.91,0,0,0,90,90.9a8.81,8.81,0,0,0,8-8.75V18.58A8.84,8.84,0,0,0,90.21,9.94ZM36,6H81.57a5.77,5.77,0,0,1,5.55,4.06A8.88,8.88,0,0,0,80.4,17.3H36a5.71,5.71,0,0,1-5.76-5.65A5.72,5.72,0,0,1,36,6ZM27.28,86.74H9.15a4,4,0,0,1-4.06-3.95V17a4,4,0,0,1,4.06-4h18a8.85,8.85,0,0,0,8.75,7.47H80.08V79.7H36A8.65,8.65,0,0,0,27.28,86.74ZM81.47,94.1H36a5.66,5.66,0,1,1,0-11.31H80.29a8.77,8.77,0,0,0,6.62,7.9A6.13,6.13,0,0,1,81.47,94.1ZM94.91,82.15a5.76,5.76,0,0,1-11.52,0V18.58a5.76,5.76,0,0,1,11.52,0Z"
        />
      </svg>

      <span
        className={`absolute inset-0 flex items-center justify-center text-[10px] sm:text-xs font-bold leading-none select-none pointer-events-none ${textClass}`}
      >
        {seat.seat_number}
      </span>
    </button>
  );
}
