import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, TicketX, RefreshCw, Filter } from "lucide-react";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { BookingStatus } from "@/types/database";

export function AdminBookingsPage() {
  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: bookingService.listAll,
  });

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "all">("all");

  const counts = useMemo(() => {
    const map = { all: bookings?.length ?? 0, confirmed: 0, cancelled: 0, failed: 0, pending: 0 };
    bookings?.forEach((b) => {
      if (b.booking_status in map) {
        map[b.booking_status as keyof typeof map]++;
      }
    });
    return map;
  }, [bookings]);

  const filtered = useMemo(() => {
    return (bookings ?? []).filter((b) => {
      if (selectedStatus !== "all" && b.booking_status !== selectedStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const ref = b.booking_reference?.toLowerCase() ?? "";
      const email = b.user?.email?.toLowerCase() ?? "";
      const name = b.user?.full_name?.toLowerCase() ?? "";
      const origin = b.schedule?.origin?.toLowerCase() ?? "";
      const dest = b.schedule?.destination?.toLowerCase() ?? "";
      const seat = b.seat?.seat_number?.toLowerCase() ?? "";
      return ref.includes(q) || email.includes(q) || name.includes(q) || origin.includes(q) || dest.includes(q) || seat.includes(q);
    });
  }, [bookings, search, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Bookings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View, search, and audit all customer reservations and reservation attempts.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="card p-4 space-y-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, passenger, route, seat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {(["all", "confirmed", "failed", "cancelled", "pending"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {st} <span className="text-[11px] opacity-80 font-mono">({counts[st]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 -mb-4 border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Passenger</th>
                <th className="py-3 px-4">Route & Vehicle</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Fare</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {b.booking_reference}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{b.user?.email ?? "—"}</p>
                    {b.user?.full_name && (
                      <p className="text-[11px] text-slate-400">{b.user.full_name}</p>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {b.schedule ? (
                      <div>
                        <span className="font-medium">{b.schedule.origin} → {b.schedule.destination}</span>
                        {b.schedule.vehicle_name && (
                          <span className="block text-[11px] text-slate-400">{b.schedule.vehicle_name}</span>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                    {b.seat?.seat_number ?? "—"}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium">
                    ₱{Number(b.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={b.booking_status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <TicketX className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No bookings match your filters</p>
                      {(search || selectedStatus !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setSelectedStatus("all");
                          }}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-1 py-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>Showing {filtered.length} of {bookings?.length ?? 0} bookings</span>
          <span>Automatic RLS audit trail</span>
        </div>
      </div>
    </div>
  );
}
