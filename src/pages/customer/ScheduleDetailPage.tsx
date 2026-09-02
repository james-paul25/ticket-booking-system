import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { scheduleService } from "@/services/scheduleService";
import { seatService } from "@/services/seatService";
import { SeatMap } from "@/features/seats/SeatMap";
import type { Seat } from "@/types/seat";
import { useAuth } from "@/features/auth/AuthContext";

export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);

  const { data: schedule } = useQuery({
    queryKey: ["schedule", id],
    queryFn: () => scheduleService.getById(id!),
    enabled: !!id,
  });

  const { data: seats } = useQuery({
    queryKey: ["seats", id],
    queryFn: () => seatService.listForSchedule(id!),
    enabled: !!id,
  });

  // Live seat map: reflects seats as the sequential processor books them.
  useEffect(() => {
    if (!id) return;
    const unsubscribe = seatService.subscribeToSchedule(id, () => {
      queryClient.invalidateQueries({ queryKey: ["seats", id] });
      queryClient.invalidateQueries({ queryKey: ["schedule", id] });
    });
    return unsubscribe;
  }, [id, queryClient]);

  if (!schedule) return <p className="text-sm text-slate-500">Loading…</p>;

  function handleContinue() {
    if (!selectedSeat) return;
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/schedules/${id}` } } });
      return;
    }
    navigate(`/booking/${schedule!.id}?seat=${selectedSeat.id}`);
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 card p-6">
        <h1 className="text-xl font-semibold mb-1">
          {schedule.origin} → {schedule.destination}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {schedule.departure_date} · {schedule.departure_time.slice(0, 5)} - {schedule.arrival_time.slice(0, 5)} ·{" "}
          {schedule.vehicle_name} ({schedule.vehicle_number})
        </p>

        {seats ? (
          <SeatMap seats={seats} selectedSeatId={selectedSeat?.id ?? null} onSelect={setSelectedSeat} />
        ) : (
          <p className="text-sm text-slate-500">Loading seat map…</p>
        )}
      </div>

      <div className="card p-6 h-fit sticky top-20 space-y-4">
        <h2 className="font-semibold">Booking summary</h2>
        <div className="text-sm space-y-1 text-slate-600 dark:text-slate-400">
          <p>
            Seat: <span className="font-medium text-slate-900 dark:text-slate-100">{selectedSeat?.seat_number ?? "—"}</span>
          </p>
          <p>
            Price:{" "}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {selectedSeat ? `₱${Number(selectedSeat.price).toFixed(2)}` : "—"}
            </span>
          </p>
          <p>
            Seats remaining: <span className="font-medium text-slate-900 dark:text-slate-100">{schedule.available_seats}</span>
          </p>
        </div>
        <button className="btn-primary w-full" disabled={!selectedSeat} onClick={handleContinue}>
          Continue to Booking
        </button>
        <p className="text-xs text-slate-400">
          Your request will be placed in the sequential booking queue and processed in order.
        </p>
      </div>
    </div>
  );
}
