import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Printer, Ticket as TicketIcon } from "lucide-react";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ConfirmationPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => bookingService.getById(id!),
    enabled: !!id,
  });

  if (!booking) return <p className="text-sm text-slate-500">Loading confirmation…</p>;

  return (
    <div className="max-w-lg mx-auto space-y-4 print:max-w-full">
      <div className="card p-8 text-center space-y-6" id="printable-ticket">
        <TicketIcon className="mx-auto text-brand-600" size={36} />
        <div>
          <h1 className="text-xl font-semibold">Booking Confirmed</h1>
          <p className="text-sm text-slate-500">Booking Reference</p>
          <p className="text-2xl font-mono tracking-wider font-bold text-brand-600">{booking.booking_reference}</p>
        </div>

        <div className="text-left text-sm border-t border-b border-slate-200 dark:border-slate-800 py-4 space-y-2">
          <Row label="Customer" value={booking.user_id} />
          <Row label="Route" value={booking.schedule ? `${booking.schedule.origin} → ${booking.schedule.destination}` : "—"} />
          <Row label="Schedule" value={booking.schedule?.departure_date ?? "—"} />
          <Row label="Seat" value={booking.seat?.seat_number ?? "—"} />
          <Row label="Amount" value={`₱${Number(booking.total_amount).toFixed(2)}`} />
          <Row label="Payment" value="Paid (simulated)" />
          <div className="flex justify-between">
            <span className="text-slate-500">Status</span>
            <StatusBadge status={booking.booking_status} />
          </div>
        </div>

        <div className="flex gap-3 print:hidden">
          <button className="btn-secondary flex-1" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
          <Link to="/bookings" className="btn-primary flex-1">
            My Bookings
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
