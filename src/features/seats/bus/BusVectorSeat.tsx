import type { Seat } from "@/types/seat";

interface BusVectorSeatProps {
  seat?: Seat | null;
  seatNumber?: string;
  isDriver?: boolean;
  label?: string;
  isSelected?: boolean;
  onSelect?: (seat: Seat) => void;
}

export function BusVectorSeat({
  seat,
  seatNumber,
  isDriver = false,
  label,
  isSelected = false,
  onSelect,
}: BusVectorSeatProps) {
  if (isDriver) {
    return (
      <div
        className="relative flex flex-col items-center justify-center w-9 h-10 sm:w-10 sm:h-11 rounded-md bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-100 text-slate-900 dark:text-slate-100 select-none shadow-xs"
        title="Driver Cockpit"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 3v6.5" />
          <path d="M4.5 16l5.5-4" />
          <path d="M19.5 16l-5.5-4" />
        </svg>
        <span className="text-[7px] sm:text-[7.5px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 mt-0.5 leading-none">
          Driver
        </span>
      </div>
    );
  }

  const effectiveNumber = label ?? seat?.seat_number ?? seatNumber ?? "";
  const isAvailable = seat ? seat.status === "available" : false;
  const isBooked = seat ? seat.status === "booked" || seat.status === "reserved" : false;

  let fillClass = "fill-white dark:fill-slate-900";
  let strokeClass = "stroke-slate-900 dark:stroke-slate-100";
  let textClass = "text-slate-900 dark:text-slate-100 font-bold";
  let wrapperClass = "";

  if (isSelected) {
    fillClass = "fill-green-600";
    strokeClass = "stroke-green-700 dark:stroke-green-500";
    textClass = "text-white font-black";
    wrapperClass = "scale-105 z-10 ring-2 ring-green-600 ring-offset-1 rounded-md";
  } else if (isAvailable) {
    fillClass = "fill-white dark:fill-slate-900 group-hover:fill-green-50 dark:group-hover:fill-slate-800";
    strokeClass = "stroke-slate-900 dark:stroke-slate-100 group-hover:stroke-green-600";
    textClass = "text-slate-900 dark:text-slate-100 group-hover:text-green-600";
    wrapperClass = "cursor-pointer active:scale-95";
  } else if (isBooked) {
    fillClass = "fill-red-600";
    strokeClass = "stroke-red-700 dark:stroke-red-500";
    textClass = "text-white font-black";
    wrapperClass = "opacity-90 cursor-not-allowed";
  }

  return (
    <button
      type="button"
      disabled={!isAvailable || !seat}
      onClick={() => seat && isAvailable && onSelect?.(seat)}
      className={`group relative flex items-center justify-center transition-all duration-150 select-none w-9 h-10 sm:w-10 sm:h-11 ${wrapperClass}`}
      aria-label={`Seat ${effectiveNumber} ${seat ? `(${seat.status})` : ""}`}
      title={`Seat ${effectiveNumber}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full rotate-90"
      >
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3.2"
          strokeMiterlimit="10"
          d="M36,17.3H80.4a8.88,8.88,0,0,1,6.72-7.25A5.77,5.77,0,0,0,81.57,6H36a5.72,5.72,0,0,0-5.76,5.66A5.71,5.71,0,0,0,36,17.3Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3.2"
          strokeMiterlimit="10"
          d="M80.29,82.79H36A5.66,5.66,0,1,0,36,94.1H81.47a6.13,6.13,0,0,0,5.44-3.41A8.77,8.77,0,0,1,80.29,82.79Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3.2"
          strokeMiterlimit="10"
          d="M80.08,79.7V20.5H35.92A8.85,8.85,0,0,1,27.17,13h-18a4,4,0,0,0-4.06,4V82.79a4,4,0,0,0,4.06,3.95H27.28a8.65,8.65,0,0,1,8.75-7Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3.2"
          strokeMiterlimit="10"
          d="M89.15,12.93a5.71,5.71,0,0,0-5.76,5.65V82.15a5.76,5.76,0,0,0,11.52,0V18.58A5.71,5.71,0,0,0,89.15,12.93Z"
        />
        <path
          className={`${fillClass} ${strokeClass} transition-colors duration-150`}
          strokeWidth="3.2"
          strokeMiterlimit="10"
          d="M90.21,9.94a8.93,8.93,0,0,0-8.74-7H36a8.94,8.94,0,0,0-8.75,6.93H9.15A7.22,7.22,0,0,0,2,17V82.79a7.06,7.06,0,0,0,7.15,7h18a8.85,8.85,0,0,0,8.75,7.26H81.47A8.91,8.91,0,0,0,90,90.9a8.81,8.81,0,0,0,8-8.75V18.58A8.84,8.84,0,0,0,90.21,9.94ZM36,6H81.57a5.77,5.77,0,0,1,5.55,4.06A8.88,8.88,0,0,0,80.4,17.3H36a5.71,5.71,0,0,1-5.76-5.65A5.72,5.72,0,0,1,36,6ZM27.28,86.74H9.15a4,4,0,0,1-4.06-3.95V17a4,4,0,0,1,4.06-4h18a8.85,8.85,0,0,0,8.75,7.47H80.08V79.7H36A8.65,8.65,0,0,0,27.28,86.74ZM81.47,94.1H36a5.66,5.66,0,1,1,0-11.31H80.29a8.77,8.77,0,0,0,6.62,7.9A6.13,6.13,0,0,1,81.47,94.1ZM94.91,82.15a5.76,5.76,0,0,1-11.52,0V18.58a5.76,5.76,0,0,1,11.52,0Z"
        />
      </svg>

      <span
        className={`absolute inset-0 flex items-center justify-center text-[9.5px] sm:text-[10.5px] font-black leading-none pointer-events-none ${textClass}`}
      >
        {effectiveNumber}
      </span>
    </button>
  );
}
