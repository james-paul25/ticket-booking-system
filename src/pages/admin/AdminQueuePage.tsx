import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AdminQueuePage() {
  const queryClient = useQueryClient();
  const { data: queue } = useQuery({ queryKey: ["admin-queue"], queryFn: () => bookingQueueService.listAll() });

  useEffect(() => {
    const unsubscribe = bookingQueueService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["admin-queue"] });
    });
    return unsubscribe;
  }, [queryClient]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sequential Booking Queue</h1>
      <p className="text-sm text-slate-500">
        Only one request may show <StatusBadge status="processing" /> at a time — the rest wait in order by request
        number.
      </p>

      <div className="card divide-y divide-slate-100 dark:divide-slate-800">
        {queue?.map((q) => (
          <div key={q.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-mono text-sm">#{q.request_number}</p>
              <p className="text-xs text-slate-500">
                Seat request {q.seat_id.slice(0, 8)}… · queued {new Date(q.queued_at).toLocaleTimeString()}
              </p>
            </div>
            <StatusBadge status={q.status} />
          </div>
        ))}
        {queue?.length === 0 && <p className="p-6 text-sm text-slate-500 text-center">Queue is empty.</p>}
      </div>
    </div>
  );
}
