import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Printer,
  ArrowRight,
  Ship,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { bookingService } from "@/services/bookingService";
import { useAuth } from "@/features/auth/AuthContext";

function formatTripDate(dateStr?: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, user } = useAuth();

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getById(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading your digital boarding pass…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center space-y-4 my-10 border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Booking Not Found</h2>
        <p className="text-xs text-slate-500">We could not locate this booking record.</p>
        <Link to="/schedules" className="btn-primary w-full">
          Browse Available Sailings
        </Link>
      </div>
    );
  }

  const passengerName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Passenger";

  return (
    <div className="max-w-lg mx-auto space-y-5 print:max-w-full print:m-0 animate-fade-in px-2 py-2">
      <div className="text-center space-y-1 print:hidden">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Boarding Pass
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Show this digital pass upon boarding at the pier gate.
        </p>
      </div>

      <div
        id="printable-ticket"
        className="relative bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden print:border-none print:shadow-none"
      >
        <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shrink-0">
                <Ship size={20} />
              </div>
              <div className="min-w-0">
                <span className="font-black text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate block leading-tight">
                  {booking.schedule?.vehicle_name ?? "Bohol Sea Transit"}
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                  Official Sea Transport Carrier
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider leading-none mb-1">
                Vessel Registry
              </span>
              <div className="px-3 py-1 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-mono font-black text-xs sm:text-sm tracking-widest border border-slate-700 shadow-xs">
                {booking.schedule?.vehicle_number}
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                Departure Port
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-black text-slate-950 dark:text-white block leading-tight">
                {booking.schedule?.departure_time?.slice(0, 5)}
              </span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mt-1">
                {booking.schedule?.origin}
              </span>
            </div>

            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Direct Route
              </span>
              <div className="w-16 sm:w-20 h-0.5 bg-slate-200 dark:bg-slate-700 my-1.5 relative">
                <ArrowRight
                  size={12}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                Non-Stop
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-0.5">
                Arrival Port
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-black text-slate-950 dark:text-white block leading-tight">
                {booking.schedule?.arrival_time?.slice(0, 5)}
              </span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block mt-1">
                {booking.schedule?.destination}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-1">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Passenger
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 truncate block">
                {passengerName}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Travel Date
              </span>
              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 block">
                {formatTripDate(booking.schedule?.departure_date)}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Seat Class
              </span>
              <span className="text-xs sm:text-sm font-black capitalize text-slate-900 dark:text-slate-100 truncate block">
                {booking.seat?.seat_type ?? "Standard"} Class
              </span>
            </div>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Boarding Window
              </span>
              <span className="text-xs sm:text-sm font-mono font-black text-slate-900 dark:text-slate-100 block">
                15 mins prior
              </span>
            </div>
          </div>

          <div className="relative my-2">
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 print:hidden" />
            <div className="border-t-2 border-dashed border-slate-200 dark:border-slate-800 w-full" />
            <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 print:hidden" />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-1">
            <div className="space-y-3 text-center sm:text-left w-full sm:w-auto">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
                  Seat Reservation
                </span>
                <span className="inline-flex items-center justify-center font-mono font-black text-3xl px-6 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-xs">
                  Seat {booking.seat?.seat_number}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Booking Reference
                </span>
                <span className="text-sm font-mono font-black tracking-wider text-slate-800 dark:text-slate-200">
                  {booking.booking_reference}
                </span>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400">
                Total Fare Paid: <b className="font-mono text-slate-900 dark:text-slate-100 font-black">₱{Number(booking.total_amount).toFixed(2)}</b>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <QrCode size={95} className="text-slate-900 dark:text-slate-100" />
              <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                Scan at Gate
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-50/80 dark:bg-slate-950/50 px-6 py-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Official Digital Sea Transit Pass</span>
          </div>
          <span className="font-mono text-[10px]">Non-Transferable · Single Entry</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 print:hidden pt-1">
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-secondary flex-1 !py-3 font-bold text-xs flex items-center justify-center gap-2"
        >
          <Printer size={16} /> Print / Save Pass
        </button>
        <Link
          to="/schedules"
          className="btn-primary flex-1 !py-3 font-black text-xs flex items-center justify-center gap-2"
        >
          Book Another Voyage <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}