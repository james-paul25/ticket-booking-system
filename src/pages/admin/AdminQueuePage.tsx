import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ListOrdered, RefreshCw, Filter, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { QueueStatus } from "@/types/database";

export function AdminQueuePage() {
  const queryClient = useQueryClient();
  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ["admin-queue"],
    queryFn: () => bookingQueueService.listAll(),
  });

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<QueueStatus | "all">("all");

  useEffect(() => {
    const unsubscribe = bookingQueueService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const counts = useMemo(() => {
    const map = { all: queue?.length ?? 0, waiting: 0, processing: 0, completed: 0, failed: 0 };
    queue?.forEach((q) => {
      if (q.status in map) {
        map[q.status as keyof typeof map]++;
      }
    });
    return map;
  }, [queue]);

  const filtered = useMemo(() => {
    return (queue ?? []).filter((q) => {
      if (selectedStatus !== "all" && q.status !== selectedStatus) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const num = String(q.request_number);
      const email = q.user?.email?.toLowerCase() ?? "";
      const seat = q.seat?.seat_number?.toLowerCase() ?? "";
      const origin = q.schedule?.origin?.toLowerCase() ?? "";
      const dest = q.schedule?.destination?.toLowerCase() ?? "";
      const msg = q.result_message?.toLowerCase() ?? "";
      return num.includes(term) || email.includes(term) || seat.includes(term) || origin.includes(term) || dest.includes(term) || msg.includes(term);
    });
  }, [queue, search, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sequential Booking Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Strict FIFO queue ensuring exactly one transaction is processed at a time.
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

      <div className="p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-blue-900 dark:text-blue-300 flex items-center gap-2.5">
        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        <span>
          <strong>Concurrency Protection:</strong> At any instant, at most one row can be in <code>processing</code> status system-wide. All other requests wait in chronological order.
        </span>
      </div>

      <div className="card p-4 space-y-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search request #, customer, seat, route..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {(["all", "waiting", "processing", "completed", "failed"] as const).map((st) => (
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
                <th className="py-3 px-4">Req #</th>
                <th className="py-3 px-4">Passenger</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Result / Message</th>
                <th className="py-3 px-4">Queued At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((q) => (
                <tr key={q.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-xs text-brand-600 dark:text-brand-400">
                    #{q.request_number}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{q.user?.email ?? q.user_id.slice(0, 8) + "…"}</p>
                    {q.user?.full_name && <p className="text-[11px] text-slate-400">{q.user.full_name}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {q.schedule ? (
                      <div>
                        <span className="font-medium">{q.schedule.origin} → {q.schedule.destination}</span>
                        {q.schedule.vehicle_name && (
                          <span className="block text-[11px] text-slate-400">{q.schedule.vehicle_name}</span>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {q.seat?.seat_number ? `Seat ${q.seat.seat_number}` : `${q.seat_id.slice(0, 8)}…`}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {q.result_message ? (
                      <span className={`inline-flex items-center gap-1 font-medium ${
                        q.result_message === "SUCCESS"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}>
                        {q.result_message === "SUCCESS" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span>{q.result_message}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">Pending processing</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(q.queued_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <ListOrdered className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        {queue?.length === 0 ? "The sequential queue is currently empty." : "No requests match your filter."}
                      </p>
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
          <span>Showing {filtered.length} of {queue?.length ?? 0} queued requests</span>
          <span>FIFO Ordering (request_number ASC)</span>
        </div>
      </div>
    </div>
  );
}
