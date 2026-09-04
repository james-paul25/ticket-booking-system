import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { SeatMap } from "@/features/seats/SeatMap";
import type { Seat } from "@/types/seat";

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["schedule", id],
    queryFn: () => scheduleService.getById(id!),
    enabled: !!id,
  });

  const { data: seats, isLoading: seatsLoading } = useQuery({
    queryKey: ["seats", id],
    queryFn: () => seatService.listForSchedule(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;
    const unsubscribe = seatService.subscribeToSchedule(id, () => {
      queryClient.invalidateQueries({ queryKey: ["seats", id] });
      queryClient.invalidateQueries({ queryKey: ["schedule", id] });
    });
    return unsubscribe;
  }, [id, queryClient]);

  function handleContinue() {
    if (!selectedSeat) return;
    navigate(`/booking/${id}?seat=${selectedSeat.id}`);
  }

  if (scheduleLoading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500">Loading voyage details…</p>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center space-y-4 my-12">
        <AlertCircle size={40} className="mx-auto text-amber-500" />
        <h2 className="text-xl font-semibold">Schedule Not Found</h2>
        <p className="text-sm text-slate-500">This voyage schedule may have departed or is no longer open.</p>
        <Link to="/schedules" className="btn-primary w-full">
          Browse Available Sailings
        </Link>
      </div>
    );
  }

  const realAvailableCount = seats
    ? seats.filter((s) => s.status === "available").length
    : schedule.available_seats;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Link
          to="/schedules"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft size={15} /> All Schedules
        </Link>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {realAvailableCount} {realAvailableCount === 1 ? "seat" : "seats"} available
        </span>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
              {schedule.vehicle_name}
            </div>
            <span className="font-mono text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 shadow-xs">
              {schedule.vehicle_number}
            </span>
          </div>
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            {schedule.departure_date}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                Departure
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Origin Port
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight leading-none my-1.5">
              {schedule.departure_time.slice(0, 5)}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {schedule.origin}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-2 py-0.5 rounded-md">
                Arrival
              </span>
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                Destination Port (Est.)
              </span>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight leading-none my-1.5">
              {schedule.arrival_time.slice(0, 5)}
            </div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
              {schedule.destination}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 card p-6 sm:p-8 flex flex-col items-center">
          <div className="text-center mb-6 max-w-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Select Your Seat</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tap any available seat to continue.
            </p>
          </div>

          {seatsLoading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading interactive vessel layout…</p>
            </div>
          ) : seats ? (
            <SeatMap
              seats={seats}
              selectedSeatId={selectedSeat?.id ?? null}
              onSelect={setSelectedSeat}
              vehicleName={schedule.vehicle_name}
              vehicleNumber={schedule.vehicle_number}
            />
          ) : null}

          <div
            className={`lg:hidden w-full max-w-sm transition-all duration-300 ease-out overflow-hidden ${
              selectedSeat
                ? "max-h-36 opacity-100 mt-5 translate-y-0"
                : "max-h-0 opacity-0 mt-0 pointer-events-none -translate-y-2"
            }`}
          >
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-green-600 text-white font-black flex items-center justify-center text-sm shadow-sm transition-transform duration-200">
                  {selectedSeat?.seat_number ?? ""}
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium leading-none">Seat Fare</div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100 leading-tight mt-0.5 font-mono">
                    ₱{selectedSeat ? Number(selectedSeat.price).toFixed(2) : "0.00"}
                  </div>
                </div>
              </div>

              <button
                onClick={handleContinue}
                className="btn-primary !py-2.5 !px-5 text-xs font-bold shadow-sm active:scale-95 transition-transform"
              >
                Continue <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

        <div className="hidden lg:block lg:col-span-4 sticky top-24 space-y-4">
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Seat Summary</h3>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full transition-all duration-300 ${
                  selectedSeat
                    ? "bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300 border border-green-200 dark:border-green-800"
                    : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-transparent"
                }`}
              >
                {selectedSeat ? "Seat Chosen" : "No Seat Selected"}
              </span>
            </div>

            <div className="space-y-3.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Selected Seat</span>
                <span
                  className={`font-mono font-black text-lg transition-all duration-200 ${
                    selectedSeat ? "text-green-600 dark:text-green-400 scale-105" : "text-slate-400"
                  }`}
                >
                  {selectedSeat ? selectedSeat.seat_number : "—"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Seat Class</span>
                <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                  {selectedSeat ? selectedSeat.seat_type : "Standard"}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Voyage Fare</span>
                <span className="font-mono font-black text-xl text-slate-900 dark:text-slate-100">
                  ₱{selectedSeat ? Number(selectedSeat.price).toFixed(2) : Number(schedule.price).toFixed(2)}
                </span>
              </div>
            </div>

            <button
              className="btn-primary w-full !py-3 font-bold transition-all duration-200 active:scale-[0.99]"
              disabled={!selectedSeat}
              onClick={handleContinue}
            >
              Continue to Booking <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}