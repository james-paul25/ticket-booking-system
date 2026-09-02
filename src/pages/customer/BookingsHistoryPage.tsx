import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BookingStatus } from "@/types/database";

const FILTERS: (BookingStatus | "all")[] = ["all", "confirmed", "pending", "cancelled", "failed", "completed"];

export function BookingsHistoryPage() {
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const { data: bookings, isLoading } = useQuery({ queryKey: ["my-bookings"], queryFn: bookingService.listMine });

  const filtered = bookings?.filter((b) => filter === "all" || b.booking_status === filter);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Bookings</h1>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f
                ? "bg-brand-600 text-white border-brand-600"
                : "border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
            }`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading…</p>}

      <div className="space-y-3">
        {filtered?.map((b) => (
          <Link
            key={b.id}
            to={`/bookings/${b.id}`}
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-mono text-sm text-brand-600">{b.booking_reference}</p>
              <p className="text-sm font-medium">
                {b.schedule ? `${b.schedule.origin} → ${b.schedule.destination}` : "Schedule"}
              </p>
              <p className="text-xs text-slate-500">
                {b.schedule?.departure_date} · Seat {b.seat?.seat_number} · ₱{Number(b.total_amount).toFixed(2)}
              </p>
            </div>
            <StatusBadge status={b.booking_status} />
          </Link>
        ))}
      </div>

      {filtered?.length === 0 && !isLoading && (
        <p className="text-center text-sm text-slate-500 py-12">No bookings in this category yet.</p>
      )}
    </div>
  );
}
