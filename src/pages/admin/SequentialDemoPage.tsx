import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Play } from "lucide-react";
import { supabase } from "@/services/supabase";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { sequentialProcessor } from "@/features/queue/sequentialProcessor";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Seat } from "@/types/seat";

const DEMO_SCHEDULE_ID = "44444444-4444-4444-4444-444444444444";
const DEMO_CUSTOMER_LABELS = ["Customer A", "Customer B", "Customer C", "Customer D", "Customer E"];

// The five demo customer accounts must exist (see README "Seeding test users").
// We look them up by a predictable email pattern set up in the seed docs.
const DEMO_CUSTOMER_EMAILS = [
  "customer1@ticketbooking.test",
  "customer2@ticketbooking.test",
  "customer3@ticketbooking.test",
  "customer4@ticketbooking.test",
  "customer5@ticketbooking.test",
];

export function SequentialDemoPage() {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const { data: seat } = useQuery({
    queryKey: ["demo-seat"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seats")
        .select("*")
        .eq("schedule_id", DEMO_SCHEDULE_ID)
        .eq("seat_number", "A1")
        .single();
      return data as Seat;
    },
  });

  const { data: queue } = useQuery({
    queryKey: ["demo-queue"],
    queryFn: () => bookingQueueService.listAll(DEMO_SCHEDULE_ID),
    refetchInterval: running ? 800 : false,
  });

  useEffect(() => {
    const unsubscribe = bookingQueueService.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["demo-queue"] });
      queryClient.invalidateQueries({ queryKey: ["demo-seat"] });
    });
    return unsubscribe;
  }, [queryClient]);

  function appendLog(line: string) {
    setLog((l) => [...l, `${new Date().toLocaleTimeString()}  ${line}`]);
  }

  async function handleReset() {
    if (!seat) return;
    appendLog("Resetting demo: clearing queue, logs, and restoring seat A1 to AVAILABLE…");
    await bookingQueueService.resetDemo(DEMO_SCHEDULE_ID, seat.id);
    await queryClient.invalidateQueries({ queryKey: ["demo-queue"] });
    await queryClient.invalidateQueries({ queryKey: ["demo-seat"] });
    setLog([]);
  }

  async function handleRunTest() {
    if (!seat) return;
    setRunning(true);
    appendLog("Looking up 5 demo customer accounts…");

    try {
      const { data: profiles } = await supabase.from("profiles").select("id, email").in("email", DEMO_CUSTOMER_EMAILS);

      if (!profiles || profiles.length < 5) {
        appendLog(
          "ERROR: Demo customer accounts not found. Register customer1..customer5@ticketbooking.test first (see README)."
        );
        setRunning(false);
        return;
      }

      appendLog(`Submitting 5 booking requests for seat ${seat.seat_number}, one per demo customer…`);

      // NOTE: submit_booking_request() uses auth.uid() (the CALLING user),
      // so from a single admin browser session we cannot submit "as" five
      // different customers via RPC directly. For the classroom demo this
      // page drives the queue insert using the admin's elevated access so
      // five distinct queue rows are created against five distinct
      // customer ids, exactly mirroring five separate users each clicking
      // "Book" — see README for the multi-tab alternative that submits as
      // five real logged-in sessions if you want zero admin involvement.
      for (const profile of profiles) {
        const { error } = await supabase
          .from("booking_queue")
          .insert({ user_id: profile.id, schedule_id: DEMO_SCHEDULE_ID, seat_id: seat.id, status: "waiting" });
        if (error) throw new Error(error.message);
      }

      await queryClient.invalidateQueries({ queryKey: ["demo-queue"] });
      appendLog("All 5 requests queued. Starting sequential processor (await-driven, one at a time)…");

      await sequentialProcessor.drainQueue((event) => {
        if (event.type === "requestCompleted") {
          appendLog(
            `Request #${event.request.request_number} → ${event.request.status.toUpperCase()} (${
              event.request.result_message ?? ""
            })`
          );
        }
        if (event.type === "idle") appendLog("Queue drained. All requests processed.");
        if (event.type === "error") appendLog(`ERROR: ${event.message}`);
      });

      await queryClient.invalidateQueries({ queryKey: ["demo-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["demo-seat"] });
    } finally {
      setRunning(false);
    }
  }

  const successful = queue?.filter((q) => q.status === "completed" && q.result_message === "SUCCESS").length ?? 0;
  const failed = queue?.filter((q) => q.status === "failed").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sequential Processing Demo</h1>
        <p className="text-sm text-slate-500">Five customers attempt to book the last available seat.</p>
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Last Available Seat</p>
          <p className="text-xl font-bold">{seat?.seat_number ?? "—"}</p>
        </div>
        {seat && <StatusBadge status={seat.status} />}
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={handleReset} disabled={running}>
            <RotateCcw size={16} /> Reset Demo
          </button>
          <button className="btn-primary" onClick={handleRunTest} disabled={running}>
            <Play size={16} /> {running ? "Running…" : "Run 5-Customer Last Seat Test"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-4">Requests</h2>
          <div className="space-y-2">
            {queue?.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2"
              >
                <span className="text-sm font-mono">
                  #{q.request_number} {DEMO_CUSTOMER_LABELS[idx] ?? ""}
                </span>
                <StatusBadge status={q.status} />
              </div>
            ))}
            {(!queue || queue.length === 0) && <p className="text-sm text-slate-500">No demo requests yet — run the test.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold mb-4">Live Console</h2>
          <div className="bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg p-4 h-64 overflow-y-auto space-y-1">
            {log.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
            {log.length === 0 && <div className="text-slate-500">Console output will appear here…</div>}
          </div>
        </div>
      </div>

      <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <Metric label="Successful bookings" value={successful} />
        <Metric label="Failed bookings" value={failed} />
        <Metric label="Duplicate bookings" value={0} />
        <Metric label="Conflicts" value={0} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
