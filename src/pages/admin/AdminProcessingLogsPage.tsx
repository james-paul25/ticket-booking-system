import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Activity, RefreshCw, Filter, Clock } from "lucide-react";
import { bookingQueueService } from "@/features/queue/bookingQueueService";

export function AdminProcessingLogsPage() {
  const queryClient = useQueryClient();
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: () => bookingQueueService.getLogs(),
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "success" | "failure" | "lifecycle">("all");

  useEffect(() => {
    const unsubscribe = bookingQueueService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const filtered = useMemo(() => {
    return (logs ?? []).filter((log) => {
      if (filterType === "success") {
        if (!["BOOKING_CONFIRMED", "BOOKING_CREATED", "PAYMENT_RECORDED"].includes(log.action)) return false;
      } else if (filterType === "failure") {
        if (!["BOOKING_FAILED"].includes(log.action)) return false;
      } else if (filterType === "lifecycle") {
        if (!["QUEUED", "PROCESSING_STARTED", "SEAT_CHECK", "SEAT_RESERVED", "PROCESSING_COMPLETED"].includes(log.action)) return false;
      }

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const num = String(log.request_number);
      const action = log.action.toLowerCase();
      const msg = log.message?.toLowerCase() ?? "";
      return num.includes(q) || action.includes(q) || msg.includes(q);
    });
  }, [logs, search, filterType]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Processing Audit Logs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Timestamped execution trail proving sequential, non-overlapping transaction order.
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
              placeholder="Search request #, action, message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {[
              { id: "all", label: "All Logs" },
              { id: "success", label: "Success Only" },
              { id: "failure", label: "Failures" },
              { id: "lifecycle", label: "Queue Lifecycle" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  filterType === tab.id
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800">
          <ol className="relative border-l-2 border-slate-200 dark:border-slate-800 space-y-6 ml-3">
            {filtered.map((log) => {
              const isFail = log.action.includes("FAILED");
              const isConfirm = log.action === "BOOKING_CONFIRMED" || log.action === "BOOKING_CREATED";
              const isCheck = log.action.includes("SEAT") || log.action.includes("PROCESSING");

              let dotClass = "bg-slate-400";
              let badgeClass = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

              if (isFail) {
                dotClass = "bg-rose-500 ring-4 ring-rose-100 dark:ring-rose-950/60";
                badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300";
              } else if (isConfirm) {
                dotClass = "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950/60";
                badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
              } else if (isCheck) {
                dotClass = "bg-blue-500 ring-4 ring-blue-100 dark:ring-blue-950/60";
                badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
              }

              return (
                <li key={log.id} className="ml-6 group">
                  <span className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full transition-transform group-hover:scale-125 ${dotClass}`} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        Req #{log.request_number}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {log.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <time>{new Date(log.created_at).toLocaleTimeString()}</time>
                      {log.processing_duration_ms != null && (
                        <span className="font-mono px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[11px] font-semibold">
                          ⚡ {Math.round(log.processing_duration_ms)}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {log.message && (
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 font-mono">
                      {log.message}
                    </p>
                  )}
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="ml-4 py-8 text-center text-sm text-slate-500">
                <Activity className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                <p>No log records match your filter criteria.</p>
              </li>
            )}
          </ol>
        </div>

        <div className="px-1 py-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>Showing {filtered.length} of {logs?.length ?? 0} log events</span>
          <span>Chronological order (oldest to newest)</span>
        </div>
      </div>
    </div>
  );
}
