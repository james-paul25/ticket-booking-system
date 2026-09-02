import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("Change of plans");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: booking } = useQuery({
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

  if (!booking) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <Link to="/bookings" className="text-sm text-brand-600 hover:underline">
        ← Back to bookings
      </Link>

      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-mono text-lg text-brand-600">{booking.booking_reference}</h1>
          <StatusBadge status={booking.booking_status} />
        </div>

        <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
          <p>Route: {booking.schedule ? `${booking.schedule.origin} → ${booking.schedule.destination}` : "—"}</p>
          <p>Date: {booking.schedule?.departure_date}</p>
          <p>Seat: {booking.seat?.seat_number}</p>
          <p>Amount: ₱{Number(booking.total_amount).toFixed(2)}</p>
          {booking.cancelled_at && <p>Cancelled at: {new Date(booking.cancelled_at).toLocaleString()}</p>}
        </div>

        {booking.booking_status === "confirmed" && (
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
            <label className="text-sm font-medium">Cancellation reason</label>
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button className="btn-secondary w-full" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Cancel this booking"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
