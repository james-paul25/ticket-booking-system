import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, MapPin, Calendar, ArrowRight } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import type { ScheduleFilters } from "@/types/schedule";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function SchedulesPage() {
  const [filters, setFilters] = useState<ScheduleFilters>({});
  const [draft, setDraft] = useState<ScheduleFilters>({});

  const { data: schedules, isLoading, error } = useQuery({
    queryKey: ["schedules", filters],
    queryFn: () => scheduleService.list(filters),
  });

  useEffect(() => {
    document.title = "Schedules — SeqBook";
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Available Schedules</h1>
        <p className="text-sm text-slate-500">Search routes, pick a seat, and book in seconds.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
        }}
        className="card p-4 grid sm:grid-cols-4 gap-3"
      >
        <div className="flex items-center gap-2 input">
          <MapPin size={16} className="text-slate-400" />
          <input
            placeholder="Origin"
            className="bg-transparent outline-none w-full"
            value={draft.origin ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, origin: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2 input">
          <MapPin size={16} className="text-slate-400" />
          <input
            placeholder="Destination"
            className="bg-transparent outline-none w-full"
            value={draft.destination ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
          />
        </div>
        <div className="flex items-center gap-2 input">
          <Calendar size={16} className="text-slate-400" />
          <input
            type="date"
            className="bg-transparent outline-none w-full"
            value={draft.date ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
          />
        </div>
        <button className="btn-primary">
          <Search size={16} /> Search
        </button>
      </form>

      {isLoading && <p className="text-sm text-slate-500">Loading schedules…</p>}
      {error && <p className="text-sm text-red-500">Failed to load schedules.</p>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules?.map((s) => (
          <Link key={s.id} to={`/schedules/${s.id}`} className="card p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">{s.vehicle_name}</span>
              <StatusBadge status={s.status} />
            </div>
            <div className="flex items-center gap-2 font-semibold mb-1">
              {s.origin} <ArrowRight size={14} className="text-slate-400" /> {s.destination}
            </div>
            <p className="text-sm text-slate-500 mb-3">
              {s.departure_date} · {s.departure_time.slice(0, 5)} → {s.arrival_time.slice(0, 5)}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-brand-600">₱{Number(s.price).toFixed(2)}</span>
              <span className="text-xs text-slate-500">{s.available_seats} seats left</span>
            </div>
          </Link>
        ))}
      </div>

      {schedules?.length === 0 && !isLoading && (
        <p className="text-center text-sm text-slate-500 py-12">No schedules match your search.</p>
      )}
    </div>
  );
}
