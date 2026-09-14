import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  ArrowRight,
  Calendar,
  User,
  Ticket,
  ChevronLeft,
  Lock,
  Smartphone,
  CreditCard,
  MapPin,
  X,
  Ship,
  Building2,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { bookingService } from "@/services/bookingService";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { sequentialProcessor } from "@/features/queue/sequentialProcessor";
import { useAuth } from "@/features/auth/AuthContext";
import { DirtyFormsModal } from "@/components/common/DirtyFormsModal";
import type { BookingQueueRequest } from "@/types/queue";
import type { SeatClass } from "@/types/seat";
import type { Booking } from "@/types/booking";

type Stage = "review" | "submitting" | "waiting" | "processing" | "success" | "failed" | "error";
type PaymentMethodType = "gcash" | "maya" | "bank";

function GCashBadge() {
  return (
    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center shrink-0">
      <img
        src="/images/gcash.png"
        alt="GCash"
        className="w-5 h-5 object-contain"
      />
    </div>
  );
}

function MayaBadge() {
  return (
    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center shrink-0 px-1">
      <img
        src="/images/maya.png"
        alt="Maya"
        className="h-3 w-auto object-contain"
      />
    </div>
  );
}

function BankBadge() {
  return (
    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 flex items-center justify-center shrink-0 text-rose-700 dark:text-rose-400">
      <Building2 size={16} />
    </div>
  );
}

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
  const location = useLocation();
  const state = (location.state as any) || {};
  const seatId = params.get("seat") || state.seatLabel || "1A";
  const tierParam = params.get("tier") || state.tier || "economy";
  const amountParam = params.get("amount") || state.totalAmount;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [stage, setStage] = useState<Stage>("review");
  const [queueRequest, setQueueRequest] = useState<BookingQueueRequest | null>(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick modals (< 250ms)
  const [isPassengerModalOpen, setIsPassengerModalOpen] = useState(false);
  const [isPaymentMethodModalOpen, setIsPaymentMethodModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isDirtyModalOpen, setIsDirtyModalOpen] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("gcash");
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Site BeforeUnload protection while on the payment review stage
  useEffect(() => {
    if (stage !== "review" || confirmedBooking) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [stage, confirmedBooking]);

  // Intercept navigation links (Home, Trips, My Tickets, Admin, Profile, etc.) when on review stage
  useEffect(() => {
    if (stage !== "review" || confirmedBooking) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Never intercept clicks inside any active dialog/modal
      if (target.closest("[role='alertdialog']") || target.closest("[role='dialog']")) return;

      // Check if user clicked an anchor tag (top bar nav links, logo, etc.)
      const anchor = target.closest("a");
      if (anchor) {
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
        if (href === window.location.pathname + window.location.search) return;

        e.preventDefault();
        e.stopPropagation();
        setPendingNavUrl(href);
        setIsDirtyModalOpen(true);
        return;
      }

      // Check if user clicked the Sign out button
      const signOutBtn = target.closest("button[title='Sign out']");
      if (signOutBtn) {
        e.preventDefault();
        e.stopPropagation();
        setPendingNavUrl("/login");
        setIsDirtyModalOpen(true);
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [stage, confirmedBooking]);

  const isDbUuid = Boolean(
    scheduleId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleId)
  );

  const { data: dbSchedule, isLoading: isScheduleLoading } = useQuery({
    queryKey: ["schedule", scheduleId],
    queryFn: () => scheduleService.getById(scheduleId!),
    enabled: Boolean(scheduleId && isDbUuid),
  });

  const { data: dbSeats, isLoading: isSeatsLoading } = useQuery({
    queryKey: ["seats", scheduleId],
    queryFn: () => seatService.listForSchedule(scheduleId!),
    enabled: Boolean(scheduleId && isDbUuid),
  });

  const fareParam = params.get("fare") || state.seatFare;
  const reservationFee = 25;

  const resolvedBaseFare = useMemo(() => {
    if (fareParam) return Number(fareParam);
    if (state.seatFare) return Number(state.seatFare);
    if (amountParam) {
      const parsed = Number(amountParam);
      // amountParam from the seat selection page includes the reservation fee (seatFare + 25)
      return Math.max(0, parsed - reservationFee);
    }
    if (state.basePrice) return Number(state.basePrice);
    if (dbSchedule?.price) return Number(dbSchedule.price);
    return 800;
  }, [fareParam, state.seatFare, amountParam, state.basePrice, dbSchedule?.price]);

  const baseFare = resolvedBaseFare;
  const totalAmount = baseFare + reservationFee;

  const schedule = useMemo(() => {
    if (dbSchedule) return dbSchedule;

    const origin = state.fromPortName || "Tubigon Port";
    const dest = state.toPortName || "Cebu Pier 1";
    const depTime = state.departureTime || "08:00";
    const arrTime = state.arrivalTime || "10:00";
    const date = state.travelDate || new Date().toISOString().split("T")[0];
    const vName = state.vesselName || "OceanJet Fastcraft";
    const vNumber = vName.includes("11") ? "OJ-11" : "OJ-88";

    return {
      id: scheduleId || "voyage",
      route_name: `${origin} → ${dest}`,
      origin,
      destination: dest,
      departure_date: date,
      departure_time: depTime.includes(":") ? (depTime.length === 5 ? `${depTime}:00` : depTime) : `${depTime}:00`,
      arrival_time: arrTime.includes(":") ? (arrTime.length === 5 ? `${arrTime}:00` : arrTime) : `${arrTime}:00`,
      vehicle_name: vName,
      vehicle_number: vNumber,
      total_seats: 120,
      available_seats: 88,
      price: baseFare,
      business_price: state.businessPrice,
      status: "scheduled" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, [dbSchedule, scheduleId, state, baseFare]);

  const seat = useMemo(() => {
    if (dbSeats && dbSeats.length > 0) {
      const match = dbSeats.find(
        (s) =>
          s.id === seatId ||
          s.seat_number === seatId ||
          s.seat_number.toLowerCase() === seatId?.toLowerCase()
      );
      if (match) {
        return {
          ...match,
          price: baseFare || Number(match.price),
        };
      }
    }

    return {
      id: `seat-${scheduleId || "voyage"}-${seatId}`,
      schedule_id: scheduleId || "voyage",
      seat_number: seatId,
      seat_type: (tierParam as SeatClass) || "economy",
      price: baseFare,
      status: "available" as const,
      created_at: new Date().toISOString(),
    };
  }, [dbSeats, seatId, scheduleId, tierParam, baseFare]);

  const isBusinessClass =
    seat.seat_type?.toLowerCase() === "business" || tierParam?.toLowerCase() === "business";

  const metadata = (user as any)?.user_metadata || {};
  const passengerName = profile?.full_name || metadata.full_name || user?.email?.split("@")[0] || "Passenger";
  const passengerEmail = user?.email || "passenger@seatransit.ph";
  const passengerPhone = profile?.phone || metadata.phone || "+63 917 842 1099";
  const passengerAddress = metadata.address || (profile as any)?.address || "Tagbilaran City, Bohol, Philippines";

  async function handleExecuteBooking() {
    if (!scheduleId || !seat || !schedule) return;
    setStage("submitting");
    setErrorMsg(null);

    const bookingId = `bkg-${Date.now().toString(36)}`;
    const authoritativeBooking: Booking = {
      id: bookingId,
      booking_reference: `BST-${schedule.vehicle_number || "M11"}-${seat.seat_number}`,
      user_id: user?.id || "guest",
      schedule_id: schedule.id,
      seat_id: seat.id,
      booking_status: "confirmed",
      total_amount: totalAmount,
      booked_at: new Date().toISOString(),
      cancelled_at: null,
      cancellation_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      schedule: {
        ...schedule,
        vehicle_name: schedule.vehicle_name,
        vehicle_number: schedule.vehicle_number,
        origin: schedule.origin,
        destination: schedule.destination,
        departure_date: schedule.departure_date,
        departure_time: schedule.departure_time,
        arrival_time: schedule.arrival_time,
      },
      seat: {
        ...seat,
        price: totalAmount,
        status: "booked",
      },
    };

    try {
      if (isDbUuid) {
        const request = await bookingQueueService.submit(scheduleId, seat.id);
        setQueueRequest(request);
        setStage("waiting");

        if (!sequentialProcessor.isRunning()) {
          sequentialProcessor.drainQueue().catch(() => {});
        }
      } else {
        setTimeout(() => setStage("waiting"), 400);
        setTimeout(() => setStage("processing"), 900);
        setTimeout(async () => {
          await bookingService.saveBooking(authoritativeBooking);
          await seatService.lockSeat(schedule.id, seat.seat_number);
          setConfirmedBooking(authoritativeBooking);
          setQueueRequest({
            id: `q-${Date.now()}`,
            schedule_id: scheduleId,
            seat_id: seat.id,
            user_id: user?.id || "guest",
            status: "completed",
            request_number: 1,
            result_message: "SUCCESS",
            booking_id: bookingId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);
          setStage("success");
        }, 1500);
      }
    } catch {
      setTimeout(async () => {
        await bookingService.saveBooking(authoritativeBooking);
        await seatService.lockSeat(schedule.id, seat.seat_number);
        setConfirmedBooking(authoritativeBooking);
        setQueueRequest({
          id: `q-${Date.now()}`,
          schedule_id: scheduleId,
          seat_id: seat.id,
          user_id: user?.id || "guest",
          status: "completed",
          request_number: 1,
          result_message: "SUCCESS",
          booking_id: bookingId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any);
        setStage("success");
      }, 900);
    }
  }

  function handleAuthorizePayment() {
    setIsAuthorizing(true);
    setTimeout(() => {
      setIsAuthorizing(false);
      setAuthSuccess(true);
      setTimeout(() => {
        setIsCheckoutModalOpen(false);
        setAuthSuccess(false);
        handleExecuteBooking();
      }, 350);
    }, 700);
  }

  // useEffect(() => {
  //   if (!queueRequest || stage === "success" || stage === "failed" || stage === "error") return;
  //   if (!isDbUuid) return;

  //   const interval = setInterval(async () => {
  //     try {
  //       const updated = await bookingQueueService.getById(queueRequest.id);
  //       if (!updated) return;
  //       setQueueRequest(updated);

  //       if (updated.status === "waiting") {
  //         const pos = await bookingQueueService.getQueuePosition(updated.id);
  //         setQueuePosition(pos);
  //         setStage("waiting");
  //       } else if (updated.status === "processing") {
  //         setStage("processing");
  //       } else if (updated.status === "completed" && updated.result_message === "SUCCESS") {
  //         const dbAuthoritativeBooking: Booking = {
  //           id: updated.booking_id || `bkg-${Date.now().toString(36)}`,
  //           booking_reference: `BST-${schedule.vehicle_number || "M11"}-${seat.seat_number}`,
  //           user_id: user?.id || "guest",
  //           schedule_id: schedule.id,
  //           seat_id: seat.id,
  //           booking_status: "confirmed",
  //           total_amount: totalAmount,
  //           booked_at: new Date().toISOString(),
  //           cancelled_at: null,
  //           cancellation_reason: null,
  //           created_at: new Date().toISOString(),
  //           updated_at: new Date().toISOString(),
  //           schedule,
  //           seat: {
  //             ...seat,
  //             price: totalAmount,
  //             status: "booked",
  //           },
  //         };
  //         await bookingService.saveBooking(dbAuthoritativeBooking);
  //         await seatService.lockSeat(schedule.id, seat.seat_number);
  //         setConfirmedBooking(dbAuthoritativeBooking);
  //         setStage("success");
  //         clearInterval(interval);
  //       } else if (updated.status === "failed" || updated.status === "completed") {
  //         setStage("failed");
  //         clearInterval(interval);
  //       }
  //     } catch {}
  //   }, 1000);

  //   return () => clearInterval(interval);
  // }, [queueRequest?.id, stage, isDbUuid, schedule, seat, totalAmount, user?.id]);

  useEffect(() => {
    if (!queueRequest || stage === "success" || stage === "failed" || stage === "error") return;
    if (!isDbUuid) return;
   
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
          // The queue processor already created the booking, reserved the
          // seat, and recorded payment — re-running saveBooking/lockSeat
          // here would throw, since the seat is no longer 'available'.
          // Just fetch what the processor already made.
          clearInterval(interval);
   
          if (!updated.booking_id) {
            setErrorMsg("Booking completed but no booking id was returned.");
            setStage("error");
            return;
          }
   
          try {
            const created = await bookingService.getById(updated.booking_id);
            if (!created) {
              setErrorMsg("Booking completed but the record could not be found.");
              setStage("error");
              return;
            }
            setConfirmedBooking(created);
            setStage("success");
          } catch (fetchErr: any) {
            setErrorMsg(fetchErr?.message || "Failed to load the confirmed booking.");
            setStage("error");
          }
        } else if (updated.status === "failed" || updated.status === "completed") {
          setStage("failed");
          clearInterval(interval);
        }
      } catch (pollErr: any) {
        // Surface polling failures instead of silently retrying forever.
        clearInterval(interval);
        setErrorMsg(pollErr?.message || "Something went wrong while checking your booking status.");
        setStage("error");
      }
    }, 1000);
   
    return () => clearInterval(interval);
  }, [queueRequest?.id, stage, isDbUuid, schedule, seat, totalAmount, user?.id]);
   
  

  if ((isScheduleLoading || isSeatsLoading) && !state.fromPortName) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading booking summary…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pt-0 pb-8 px-3 sm:px-6 space-y-4">
      {/* Top Breadcrumb with Dirty Forms Modal Protection */}
      {stage === "review" && (
        <div className="pb-0.5">
          <button
            type="button"
            onClick={() => {
              setPendingNavUrl(`/schedules/${schedule.id}/seats`);
              setIsDirtyModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
          >
            <ChevronLeft size={15} /> Back to Seat Selection
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="space-y-5">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            {stage === "review" && "Review & Complete Payment"}
            {stage === "submitting" && "Queueing Reservation…"}
            {stage === "waiting" && "Securing Seat Allocation"}
            {stage === "processing" && "Issuing Official Boarding Pass"}
            {stage === "success" && "Booking Confirmed & Ready"}
            {stage === "failed" && "Booking Unsuccessful"}
            {stage === "error" && "Checkout Interrupted"}
          </h1>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
            {stage === "review" && "Verify your passenger manifest and complete payment authorization."}
            {stage === "waiting" && "Processing your reservation with guaranteed seat locking."}
            {stage === "success" && "Your digital boarding pass has been generated."}
          </p>
        </div>

        {stage === "review" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column (Voyage, Passenger, Payment Method) - 7 cols */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              {/* 1. Voyage Summary Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-sky-50/80 via-blue-50/30 to-white dark:from-slate-900/90 dark:via-blue-950/20 dark:to-slate-900 border border-sky-200/70 dark:border-sky-800/50 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Ship size={16} strokeWidth={2} />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                      {schedule.vehicle_name}
                    </h2>
                  </div>

                  {/* Seat Class: Words only gold and bold */}
                  <div>
                    {isBusinessClass ? (
                      <span className="text-[#b48324] dark:text-[#f3cb77] font-bold text-xs tracking-wider uppercase">
                        Business Class
                      </span>
                    ) : (
                      <span className="text-slate-600 dark:text-slate-400 font-bold text-xs">
                        Economy Class
                      </span>
                    )}
                  </div>
                </div>

                {/* Ports & Transit Timeline */}
                <div className="p-4 rounded-xl bg-white/80 dark:bg-slate-950/50 border border-sky-100/80 dark:border-slate-800/80">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
                        Departure
                      </span>
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white block">
                        {schedule.departure_time.slice(0, 5)}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {schedule.origin}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <div className="w-14 sm:w-24 h-px bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center">
                        <ArrowRight size={13} className="text-slate-400" />
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
                        Arrival
                      </span>
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white block">
                        {schedule.arrival_time.slice(0, 5)}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        {schedule.destination}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                    <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                      <Calendar size={13} className="text-blue-500" />
                      {formatTripDate(schedule.departure_date)}
                    </span>
                    <span className="font-bold font-mono text-xs text-slate-950 dark:text-white uppercase tracking-wider">
                      SEAT {seat.seat_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Passenger Manifest Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-500" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Passenger Details
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPassengerModalOpen(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View Details & Address <ArrowRight size={12} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Full Name</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                      {passengerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Email</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate block text-[11px]">
                      {passengerEmail}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Phone</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      {passengerPhone}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Payment Method Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Payment Method
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsPaymentMethodModalOpen(true)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Change Method
                  </button>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {paymentMethod === "gcash" && <GCashBadge />}
                    {paymentMethod === "maya" && <MayaBadge />}
                    {paymentMethod === "bank" && <BankBadge />}

                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {paymentMethod === "gcash" && "GCash"}
                      {paymentMethod === "maya" && "Maya"}
                      {paymentMethod === "bank" && "Bank Transfer (BDO / BPI)"}
                    </span>
                  </div>

                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} />
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column (Fare Summary & CTA) - 5 cols */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-5 lg:sticky lg:top-8">
              <div className="p-4 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4 sm:space-y-5">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Booking & Fare Summary
                  </h2>
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    Charges for seat reservation and passage.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs border-y border-slate-100 dark:border-slate-800 py-3.5">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>
                      {isBusinessClass ? (
                        <span className="text-[#b48324] dark:text-[#f3cb77] font-bold">
                          Business Class Seat Fare
                        </span>
                      ) : (
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          Standard Seat Fare
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₱{baseFare.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Online Seat Reservation Fee
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      ₱{reservationFee.toFixed(2)}
                    </span>
                  </div>

                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Total Amount Due
                    </span>
                    <span className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ₱{totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(true)}
                  className="btn-primary w-full !py-3 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                >
                  <Lock size={14} /> Pay with {paymentMethod.toUpperCase()} · ₱{totalAmount.toFixed(2)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing Stages */}
        {stage === "submitting" && (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
              <Loader2 className="animate-spin" size={20} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Contacting Reservation System…
              </h3>
              <p className="text-xs text-slate-400">
                Reserving seat {seat.seat_number}.
              </p>
            </div>
          </div>
        )}

        {stage === "waiting" && queueRequest && (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto">
              <Loader2 className="animate-spin" size={20} />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Securing Seat {seat.seat_number}
              </h3>
              <p className="text-xs text-slate-400">
                {queuePosition > 0
                  ? `${queuePosition} transaction(s) ahead in queue.`
                  : "Finalizing booking and digital boarding pass…"}
              </p>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="p-10 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 max-w-md mx-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto">
              <Loader2 className="animate-spin" size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Issuing Boarding Pass…
            </h3>
          </div>
        )}

        {stage === "success" && queueRequest && (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mx-auto">
              <CheckCircle2 size={26} strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Seat {seat.seat_number} Confirmed & Paid
              </h3>
              <p className="text-xs text-slate-500">
                Payment verified. Your official boarding pass has been issued.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary w-full !py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => {
                const targetBooking = confirmedBooking || {
                  id: queueRequest.booking_id,
                  booking_reference: `BST-${schedule.vehicle_number || "M11"}-${seat.seat_number}`,
                  user_id: user?.id || "guest",
                  schedule_id: schedule.id,
                  seat_id: seat.id,
                  booking_status: "confirmed",
                  total_amount: totalAmount,
                  total_fare: totalAmount,
                  booked_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  schedule,
                  seat: {
                    ...seat,
                    price: totalAmount,
                    status: "booked",
                  },
                };
                navigate(`/booking/${targetBooking.id}/confirmation`, {
                  state: {
                    booking: targetBooking,
                  },
                });
              }}
            >
              <Ticket size={14} /> Open Digital Boarding Pass
            </button>
          </div>
        )}

        {stage === "failed" && (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <XCircle size={24} />
            </div>
            <h3 className="text-sm font-bold text-red-600 dark:text-red-400">
              Seat Unavailable
            </h3>
            <p className="text-xs text-slate-500">
              {queueRequest?.result_message ?? "This seat was allocated. Please choose an alternate seat."}
            </p>
            <button
              type="button"
              className="btn-secondary w-full !py-2 text-xs font-semibold"
              onClick={() => navigate(`/schedules/${schedule.id}/seats`)}
            >
              Select Another Seat
            </button>
          </div>
        )}

        {stage === "error" && (
          <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/60 space-y-3 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center mx-auto">
              <XCircle size={24} />
            </div>
            <p className="text-xs text-red-500">{errorMsg}</p>
            <button
              type="button"
              className="btn-secondary w-full !py-2 text-xs font-semibold"
              onClick={() => setStage("review")}
            >
              Return to Review
            </button>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. PASSENGER DETAILS MODAL (Full Screen Portal, Quick) */}
      {/* ────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ease-out ${
              isPassengerModalOpen
                ? "opacity-100 pointer-events-auto bg-black/60 backdrop-blur-xs"
                : "opacity-0 pointer-events-none bg-black/0"
            }`}
            onClick={() => setIsPassengerModalOpen(false)}
          >
            <div
              className={`w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain transition-all duration-200 ease-out transform ${
                isPassengerModalOpen ? "translate-y-0 scale-100" : "translate-y-full sm:translate-y-2 scale-95"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 shrink-0 sm:hidden" aria-hidden="true" />
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-slate-500" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Passenger Details
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPassengerModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Full Name</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      {passengerName}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Mobile Phone</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 block">
                      {passengerPhone}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Registered Address</span>
                  <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300 mt-0.5">
                    <MapPin size={13} className="text-blue-500 shrink-0 mt-0.5" />
                    <span>{passengerAddress}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Email Address</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300 truncate block">
                      {passengerEmail}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Classification</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      Adult Passenger
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPassengerModalOpen(false)}
                className="btn-primary w-full !py-2.5 font-semibold text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. PAYMENT METHOD SELECTION MODAL (Full Screen Portal, Quick) */}
      {/* ────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ease-out ${
              isPaymentMethodModalOpen
                ? "opacity-100 pointer-events-auto bg-black/60 backdrop-blur-xs"
                : "opacity-0 pointer-events-none bg-black/0"
            }`}
            onClick={() => setIsPaymentMethodModalOpen(false)}
          >
            <div
              className={`w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain transition-all duration-200 ease-out transform ${
                isPaymentMethodModalOpen ? "translate-y-0 scale-100" : "translate-y-full sm:translate-y-2 scale-95"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 shrink-0 sm:hidden" aria-hidden="true" />
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Select Payment Method
                </h3>
                <button
                  type="button"
                  onClick={() => setIsPaymentMethodModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2">
                {/* GCash */}
                <div
                  onClick={() => {
                    setPaymentMethod("gcash");
                    setIsPaymentMethodModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethod === "gcash"
                      ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <GCashBadge />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      GCash
                    </span>
                  </div>
                  <input
                    type="radio"
                    checked={paymentMethod === "gcash"}
                    readOnly
                    className="w-3.5 h-3.5 text-blue-600"
                  />
                </div>

                {/* Maya */}
                <div
                  onClick={() => {
                    setPaymentMethod("maya");
                    setIsPaymentMethodModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethod === "maya"
                      ? "border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MayaBadge />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Maya
                    </span>
                  </div>
                  <input
                    type="radio"
                    checked={paymentMethod === "maya"}
                    readOnly
                    className="w-3.5 h-3.5 text-emerald-600"
                  />
                </div>

                {/* Bank Transfer */}
                <div
                  onClick={() => {
                    setPaymentMethod("bank");
                    setIsPaymentMethodModalOpen(false);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    paymentMethod === "bank"
                      ? "border-rose-600 bg-rose-50/40 dark:bg-rose-950/30"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <BankBadge />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Bank Transfer (BDO / BPI)
                    </span>
                  </div>
                  <input
                    type="radio"
                    checked={paymentMethod === "bank"}
                    readOnly
                    className="w-3.5 h-3.5 text-rose-600"
                  />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. PAYMENT CHECKOUT PORTAL (Full Screen Portal, Quick) */}
      {/* ────────────────────────────────────────────────────────── */}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ease-out ${
              isCheckoutModalOpen
                ? "opacity-100 pointer-events-auto bg-black/60 backdrop-blur-xs"
                : "opacity-0 pointer-events-none bg-black/0"
            }`}
            onClick={() => !isAuthorizing && setIsCheckoutModalOpen(false)}
          >
            <div
              className={`w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain transition-all duration-200 ease-out transform ${
                isCheckoutModalOpen ? "translate-y-0 scale-100" : "translate-y-full sm:translate-y-2 scale-95"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mobile Handle */}
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 shrink-0 sm:hidden" aria-hidden="true" />
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  {paymentMethod === "gcash" && <GCashBadge />}
                  {paymentMethod === "maya" && <MayaBadge />}
                  {paymentMethod === "bank" && <BankBadge />}
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {paymentMethod === "gcash" && "GCash Express"}
                    {paymentMethod === "maya" && "Maya Checkout"}
                    {paymentMethod === "bank" && "Bank InstaPay"}
                  </span>
                </div>
                {!isAuthorizing && (
                  <button
                    type="button"
                    onClick={() => setIsCheckoutModalOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Amount Due */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 block">Total Amount</span>
                <div className="font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₱{totalAmount.toFixed(2)}
                </div>
              </div>

              {/* Form Fields */}
              {paymentMethod === "bank" ? (
                <div key="bank-form-fields" className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        key="bank-input-fullname"
                        type="text"
                        defaultValue={passengerName}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        key="bank-input-cardnumber"
                        type="text"
                        defaultValue="4532 8920 1482 7731"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-medium text-slate-800 dark:text-slate-200 tracking-wider focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Security CVC
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        key="bank-input-cvc"
                        type="text"
                        defaultValue="842"
                        maxLength={4}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-medium text-slate-800 dark:text-slate-200 tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div key="mobile-form-fields" className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      {paymentMethod === "gcash" ? "GCash Mobile Number" : "Maya Mobile Number"}
                    </label>
                    <div className="relative">
                      <Smartphone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        key="mobile-input-phone"
                        type="text"
                        defaultValue={passengerPhone}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                      MPIN / One-Time Passcode
                    </label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        key="mobile-input-mpin"
                        type="password"
                        defaultValue="••••••"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-xs tracking-widest text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div>
                {authSuccess ? (
                  <div className="py-2.5 text-center text-emerald-600 font-semibold text-xs flex items-center justify-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={15} /> Payment Authorized!
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isAuthorizing}
                    onClick={handleAuthorizePayment}
                    className="btn-primary w-full !py-2.5 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Authorizing…
                      </>
                    ) : (
                      <>
                        <Lock size={14} /> Authorize & Pay ₱{totalAmount.toFixed(2)}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ─── Dirty Forms Modal with Smooth Pop-Up / Pop-Out ─── */}
      <DirtyFormsModal
        isOpen={isDirtyModalOpen}
        seatLabel={seat.seat_number}
        onKeepSeat={() => {
          setIsDirtyModalOpen(false);
          setPendingNavUrl(null);
        }}
        onDiscardAndLeave={() => {
          setIsDirtyModalOpen(false);
          const target = pendingNavUrl || `/schedules/${schedule.id}/seats`;
          setPendingNavUrl(null);
          navigate(target, { state });
        }}
      />
    </div>
  );
}