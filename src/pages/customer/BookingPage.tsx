import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { sequentialProcessor } from "@/features/queue/sequentialProcessor";
import type { BookingQueueRequest } from "@/types/queue";

type Stage = "review" | "submitting" | "waiting" | "processing" | "success" | "failed" | "error";

export function BookingPage() {
  const { id: scheduleId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const seatId = params.get("seat");
  const navigate = useNavigate();

  const [stage, setStage] = useState<Stage>("review");
  const [queueRequest, setQueueRequest] = useState<BookingQueueRequest | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: schedule } = useQuery({
    queryKey: ["schedule", scheduleId],
    queryFn: () => scheduleService.getById(scheduleId!),
    enabled: !!scheduleId,
  });
  const { data: seats } = useQuery({
    queryKey: ["seats", scheduleId],
    queryFn: () => seatService.listForSchedule(scheduleId!),
    enabled: !!scheduleId,
  });
  const seat = seats?.find((s) => s.id === seatId);

  async function handleConfirmBooking() {
    if (!scheduleId || !seatId) return;
    setStage("submitting");
    setErrorMsg(null);
    try {
      const request = await bookingQueueService.submit(scheduleId, seatId);
      setQueueRequest(request);
      setStage("waiting");

      // Kick the sequential processor (idempotent — if another admin/tab is
      // already draining the queue, this simply becomes a no-op via the
      // single-processing-slot guarantee in the database).
      if (!sequentialProcessor.isRunning()) {
        sequentialProcessor.drainQueue().catch(() => {
          /* surfaced via polling below */
        });
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit booking request");
      setStage("error");
    }
  }

  // Poll queue position + status while waiting/processing.
  useEffect(() => {
    if (!queueRequest || stage === "success" || stage === "failed" || stage === "error") return;

    const interval = setInterval(async () => {
      try {
        const updated = await bookingQueueService.getById(queueRequest.id);
        if (!updated) return;
        setQueueRequest(updated);

        if (updated.status === "waiting") {
          const pos = await bookingQueueService.getQueuePosition(updated.id);
          setQueuePosition(pos);
          setStage("waiting");
        } else if (updated.status === "processing") {
          setStage("processing");
        } else if (updated.status === "completed" && updated.result_message === "SUCCESS") {
          setStage("success");
          clearInterval(interval);
        } else if (updated.status === "failed" || updated.status === "completed") {
          setStage("failed");
          clearInterval(interval);
        }
      } catch {
        /* transient — keep polling */
      }
    }, 1200);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueRequest?.id, stage]);

  if (!schedule || !seat) {
    return <p className="text-sm text-slate-500">Loading booking details…</p>;
  }

  return (
    <div className="max-w-lg mx-auto card p-8 space-y-6">
      <h1 className="text-xl font-semibold">
        {stage === "review" && "Review your booking"}
        {(stage === "submitting" || stage === "waiting" || stage === "processing") && "Processing your request"}
        {stage === "success" && "Booking confirmed"}
        {stage === "failed" && "Booking unsuccessful"}
        {stage === "error" && "Something went wrong"}
      </h1>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 text-sm space-y-1">
        <p>
          Route: <b>{schedule.origin} → {schedule.destination}</b>
        </p>
        <p>
          Date: <b>{schedule.departure_date}</b> · Departs {schedule.departure_time.slice(0, 5)}
        </p>
        <p>
          Seat: <b>{seat.seat_number}</b> ({seat.seat_type})
        </p>
        <p>
          Amount: <b>₱{Number(seat.price).toFixed(2)}</b> (simulated payment)
        </p>
      </div>

      {stage === "review" && (
        <button className="btn-primary w-full" onClick={handleConfirmBooking}>
          Confirm & Enter Sequential Queue
        </button>
      )}

      {stage === "submitting" && <CenterState icon={<Loader2 className="animate-spin" />} text="Submitting your request…" />}

      {stage === "waiting" && queueRequest && (
        <CenterState
          icon={<Clock className="text-amber-500" />}
          text={`Request #${queueRequest.request_number} queued — ${
            queuePosition > 0 ? `${queuePosition} request(s) ahead of you` : "you're next in line"
          }.`}
        />
      )}

      {stage === "processing" && queueRequest && (
        <CenterState
          icon={<Loader2 className="animate-spin text-brand-600" />}
          text={`Request #${queueRequest.request_number} is being processed now…`}
        />
      )}

      {stage === "success" && queueRequest?.booking_id && (
        <div className="text-center space-y-4">
          <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
          <p className="text-sm text-slate-600 dark:text-slate-400">Seat {seat.seat_number} is yours.</p>
          <button className="btn-primary w-full" onClick={() => navigate(`/booking/${queueRequest.booking_id}/confirmation`)}>
            View Confirmation
          </button>
        </div>
      )}

      {stage === "failed" && (
        <div className="text-center space-y-4">
          <XCircle className="mx-auto text-red-500" size={40} />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {queueRequest?.result_message ?? "This seat was booked by another request that was processed first."}
          </p>
          <button className="btn-secondary w-full" onClick={() => navigate(`/schedules/${schedule.id}`)}>
            Choose Another Seat
          </button>
        </div>
      )}

      {stage === "error" && (
        <div className="text-center space-y-4">
          <XCircle className="mx-auto text-red-500" size={40} />
          <p className="text-sm text-red-500">{errorMsg}</p>
          <button className="btn-secondary w-full" onClick={() => setStage("review")}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

function CenterState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="text-3xl">{icon}</div>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}
