import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingQueueService } from "@/features/queue/bookingQueueService";

export function AdminProcessingLogsPage() {
  const queryClient = useQueryClient();
  const { data: logs } = useQuery({ queryKey: ["admin-logs"], queryFn: () => bookingQueueService.getLogs() });

  useEffect(() => {
    const unsubscribe = bookingQueueService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-logs"] });
    });
    return unsubscribe;
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Processing Logs</h1>
      <p className="text-sm text-slate-500">
        Timestamped proof that request N+1 never starts processing until request N completes.
      </p>

      <div className="card p-6">
        <ol className="relative border-l border-slate-200 dark:border-slate-800 space-y-6 ml-2">
          {logs?.map((log) => (
            <li key={log.id} className="ml-4">
              <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-brand-600" />
              <time className="text-xs text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</time>
              <p className="text-sm">
                <span className="font-mono text-xs text-slate-500">#{log.request_number}</span>{" "}
                <span className="font-medium">{log.action}</span>
                {log.message ? ` — ${log.message}` : ""}
                {log.processing_duration_ms != null && (
                  <span className="text-xs text-slate-400"> ({Math.round(log.processing_duration_ms)}ms)</span>
                )}
              </p>
            </li>
          ))}
          {logs?.length === 0 && <p className="text-sm text-slate-500">No processing activity yet.</p>}
        </ol>
      </div>
    </div>
  );
}
