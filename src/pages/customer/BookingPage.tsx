import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ArrowRight,
  Coins,
  Calendar,
  User,
  Ticket,
  ChevronLeft,
  Lock,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { sequentialProcessor } from "@/features/queue/sequentialProcessor";
import { useAuth } from "@/features/auth/AuthContext";
import type { BookingQueueRequest } from "@/types/queue";

type Stage = "review" | "submitting" | "waiting" | "processing" | "success" | "failed" | "error";

function formatTripDate(dateStr?: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BookingPage() {
  const { id: scheduleId } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const seatId = params.get("seat");
  const navigate = useNavigate();
  const { user, profile } = useAuth();

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

      if (!sequentialProcessor.isRunning()) {
        sequentialProcessor.drainQueue().catch(() => {});
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit booking request");
      setStage("error");
    }
  }

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
      } catch {}
    }, 1200);

    return () => clearInterval(interval);
  }, [queueRequest?.id, stage]);

  if (!schedule || !seat) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading booking details…</p>
      </div>
    );
  }

  const passengerName = profile?.full_name ?? user?.email?.split("@")[0] ?? "Passenger";
  const passengerEmail = user?.email ?? "Not provided";
  const fare = Number(seat.price);

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fade-in px-2">
      <div className="flex items-center justify-between">
        <Link
          to={`/schedules/${schedule.id}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
        >
          <ChevronLeft size={16} /> Back to Seat Selection
        </Link>
        <span className="text-[11px] font-mono font-bold text-slate-400">
          Trip Ref: {schedule.vehicle_number}
        </span>
      </div>

      <div className="card p-5 sm:p-7 space-y-6 shadow-md border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {stage === "review" && "Review & Complete Payment"}
            {stage === "submitting" && "Queueing Request…"}
            {stage === "waiting" && "Securing Seat Reservation"}
            {stage === "processing" && "Processing Transaction"}
            {stage === "success" && "Booking Confirmed"}
            {stage === "failed" && "Booking Unsuccessful"}
            {stage === "error" && "Checkout Interrupted"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {stage === "review" && "Verify your passenger and travel details before confirming."}
            {stage === "waiting" && "Processing your reservation with guaranteed seat availability."}
            {stage === "success" && "Your digital boarding pass is ready."}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                {schedule.vehicle_name}
              </span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                {schedule.vehicle_number}
              </span>
            </div>
            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Seat {seat.seat_number}
            </span>
          </div>

          <div className="flex items-center justify-between py-1">
            <div>
              <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100 block">
                {schedule.departure_time.slice(0, 5)}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {schedule.origin}
              </span>
            </div>

            <div className="flex flex-col items-center px-4">
              <ArrowRight size={16} className="text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">Direct</span>
            </div>

            <div className="text-right">
              <span className="font-mono text-xl font-black text-slate-900 dark:text-slate-100 block">
                {schedule.arrival_time.slice(0, 5)}
              </span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                {schedule.destination}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Calendar size={13} />
              {formatTripDate(schedule.departure_date)}
            </span>
            <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
              {seat.seat_type} Class
            </span>
          </div>
        </div>

        {stage === "review" && (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                Passenger Details
              </span>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <User size={15} className="text-slate-500" />
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {passengerName}
                  </span>
                </div>
                <span className="text-slate-400 font-mono text-[11px] truncate max-w-[180px]">
                  {passengerEmail}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block">
                Payment Method
              </label>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                  <Coins size={20} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100">
                      Cash at Terminal Only
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Policy
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Pay in cash at the terminal ticketing counter prior to boarding. Instant seat reservation is confirmed immediately.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Standard Seat Fare</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  ₱{fare.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Terminal & Booking Fee</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₱0.00 (Free)
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Total Fare to Pay (Cash)
                </span>
                <span className="font-mono font-black text-2xl text-slate-900 dark:text-slate-100">
                  ₱{fare.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary w-full !py-3.5 font-black text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98"
              onClick={handleConfirmBooking}
            >
              <Lock size={15} /> Confirm & Reserve Seat · ₱{fare.toFixed(2)}
            </button>
          </div>
        )}

        {stage === "submitting" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 flex items-center justify-center">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-black text-slate-900 dark:text-slate-100">
                Connecting to Reservation System…
              </p>
              <p className="text-xs text-slate-400">
                Reserving seat {seat.seat_number} exclusively for you
              </p>
            </div>
          </div>
        )}

        {stage === "waiting" && queueRequest && (
          <div className="flex flex-col items-center gap-3.5 py-6 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-black text-slate-900 dark:text-slate-100">
                Securing Seat {seat.seat_number}
              </div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {queuePosition > 0
                  ? `${queuePosition} transaction(s) ahead in line. Confirming your seat now.`
                  : "Finalizing booking and preparing digital boarding pass…"}
              </p>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-sm">
              <Loader2 className="animate-spin" size={24} />
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-slate-100">
              Issuing Boarding Pass…
            </p>
          </div>
        )}

        {stage === "success" && queueRequest && (
          <div className="text-center space-y-4 py-3 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 size={30} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Seat {seat.seat_number} Successfully Booked!
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Reservation confirmed. Please present your digital boarding pass and pay cash at the terminal gate.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary w-full !py-3.5 text-sm font-black flex items-center justify-center gap-2 shadow-md"
              onClick={() => navigate(`/booking/${queueRequest.booking_id}/confirmation`)}
            >
              <Ticket size={16} /> Open Boarding Pass
            </button>
          </div>
        )}

        {stage === "failed" && (
          <div className="text-center space-y-4 py-2 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto">
              <XCircle size={30} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-red-600 dark:text-red-400">
                Seat Unavailable
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                {queueRequest?.result_message ??
                  "This seat was booked by another passenger. Please pick an alternative seat."}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary w-full !py-2.5 text-xs font-bold"
              onClick={() => navigate(`/schedules/${schedule.id}`)}
            >
              Pick Another Seat
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="text-center space-y-4 py-2 animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto">
              <XCircle size={30} />
            </div>
            <p className="text-xs text-red-500">{errorMsg}</p>
            <button
              type="button"
              className="btn-secondary w-full !py-2.5 text-xs font-bold"
              onClick={() => setStage("review")}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
