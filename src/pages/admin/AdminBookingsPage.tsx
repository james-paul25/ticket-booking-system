import { useQuery } from "@tanstack/react-query";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AdminBookingsPage() {
  const { data: bookings } = useQuery({ queryKey: ["admin-bookings"], queryFn: bookingService.listAll });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">All Bookings</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Reference</th>
              <th className="p-3">Route</th>
              <th className="p-3">Seat</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {bookings?.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-mono text-xs">{b.booking_reference}</td>
                <td className="p-3">{b.schedule ? `${b.schedule.origin} → ${b.schedule.destination}` : "—"}</td>
                <td className="p-3">{b.seat?.seat_number}</td>
                <td className="p-3">₱{Number(b.total_amount).toFixed(2)}</td>
                <td className="p-3">
                  <StatusBadge status={b.booking_status} />
                </td>
                <td className="p-3 text-xs text-slate-500">{new Date(b.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
