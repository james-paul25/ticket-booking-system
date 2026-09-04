import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ticket,
  AlertTriangle,
  Bus,
  ArrowRight,
} from "lucide-react";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("Change of plans");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getById(id!),
    enabled: !!id,
  });

  async function handleCancel() {
    if (!booking) return;
    setCancelling(true);
    setError(null);
    try {
      await bookingService.cancel(booking.id, reason);
      await queryClient.invalidateQueries({ queryKey: ["booking", id] });
      await queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancelling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto py-14 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading booking record…</p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center space-y-4 my-10 border-slate-200 dark:border-slate-800">
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Booking Not Found</h2>
        <Link to="/bookings" className="btn-primary w-full">
          Back to Bookings
        </Link>
      </div>
    );
  }

  const isConfirmed = booking.booking_status === "confirmed";

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in px-2 py-2">
      <Link
        to="/bookings"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
      >
        <ArrowLeft size={15} /> Back to My Bookings
      </Link>

      <div className="card p-6 sm:p-7 space-y-6 shadow-sm border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-0.5">
              Booking Reference
            </span>
            <span className="font-mono text-lg font-black text-slate-900 dark:text-slate-100">
              {booking.booking_reference}
            </span>
          </div>
          <StatusBadge status={booking.booking_status} />
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200">
                <Bus size={17} />
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                {booking.schedule?.vehicle_name}
              </span>
            </div>

            <div className="px-2.5 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-mono font-black text-xs tracking-wider">
              {booking.schedule?.vehicle_number}
            </div>
          </div>

          <div className="flex items-baseline justify-between py-1">
            <div>
              <span className="font-mono text-2xl font-black text-slate-950 dark:text-white block leading-tight">
                {booking.schedule?.departure_time?.slice(0, 5)}
              </span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {booking.schedule?.origin}
              </span>
            </div>

            <div className="flex flex-col items-center px-4">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                Direct
              </span>
              <div className="w-14 h-0.5 bg-slate-200 dark:bg-slate-700 my-1 relative">
                <ArrowRight
                  size={12}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="text-right">
              <span className="font-mono text-2xl font-black text-slate-950 dark:text-white block leading-tight">
                {booking.schedule?.arrival_time?.slice(0, 5)}
              </span>
              <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                {booking.schedule?.destination}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Travel Date
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {formatTripDate(booking.schedule?.departure_date)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-0.5">
                Assigned Seat
              </span>
              <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                Seat {booking.seat?.seat_number} ({booking.seat?.seat_type ?? "Standard"})
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5 text-xs pt-1">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Standard Trip Fare</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              ₱{Number(booking.total_amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between py-1 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500">Booking & Terminal Fee</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ₱0.00 (Waived)
            </span>
          </div>
          <div className="flex justify-between items-baseline py-1 border-t border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">Total Paid</span>
            <span className="font-mono font-black text-xl text-slate-900 dark:text-slate-100">
              ₱{Number(booking.total_amount).toFixed(2)}
            </span>
          </div>

          {booking.cancelled_at && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              <span className="font-bold block">Trip Cancelled</span>
              <span>Cancelled on {new Date(booking.cancelled_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            to={`/booking/${booking.id}/confirmation`}
            className="btn-primary flex-1 text-xs !py-3 font-black flex items-center justify-center gap-2 shadow-xs"
          >
            <Ticket size={16} /> Open Digital Boarding Pass
          </Link>
        </div>

        {isConfirmed && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>Cancel Reservation</span>
            </div>
            <p className="text-xs text-slate-500">
              Releasing this seat will cancel your booking and automatically return the seat to available inventory.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 outline-none flex-1"
              >
                <option value="Change of plans">Change of plans</option>
                <option value="Booked wrong time">Booked wrong time</option>
                <option value="Emergency">Emergency</option>
                <option value="Other">Other</option>
              </select>

              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger !py-2 !px-4 text-xs font-bold shrink-0"
              >
                {cancelling ? "Releasing Seat…" : "Confirm Cancellation"}
              </button>
            </div>

            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
