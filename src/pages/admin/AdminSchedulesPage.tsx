import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2, Search, Calendar, Filter, Eye, RefreshCw } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { ScheduleStatus } from "@/types/database";

export function AdminSchedulesPage() {
  const queryClient = useQueryClient();
  const { data: schedules, isLoading, refetch } = useQuery({
    queryKey: ["schedules", {}],
    queryFn: () => scheduleService.list(),
  });

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<ScheduleStatus | "all">("all");

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to cancel/delete this schedule?")) return;
    await scheduleService.remove(id);
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
  }

  const counts = useMemo(() => {
    const map = { all: schedules?.length ?? 0, scheduled: 0, boarding: 0, departed: 0, completed: 0, cancelled: 0 };
    schedules?.forEach((s) => {
      if (s.status in map) {
        map[s.status as keyof typeof map]++;
      }
    });
    return map;
  }, [schedules]);

  const filtered = useMemo(() => {
    return (schedules ?? []).filter((s) => {
      if (selectedStatus !== "all" && s.status !== selectedStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const origin = s.origin.toLowerCase();
      const dest = s.destination.toLowerCase();
      const veh = s.vehicle_name?.toLowerCase() ?? "";
      const date = s.departure_date?.toLowerCase() ?? "";
      return origin.includes(q) || dest.includes(q) || veh.includes(q) || date.includes(q);
    });
  }, [schedules, search, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Schedules</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure transit routes, departure schedules, vehicle seat inventories, and pricing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <Link to="/admin/schedules/create" className="btn-primary inline-flex items-center gap-1.5 text-xs py-2">
            <Plus className="h-4 w-4" />
            <span>Add Schedule</span>
          </Link>
        </div>
      </div>

      <div className="card p-4 space-y-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search origin, destination, vehicle, date..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {(["all", "scheduled", "boarding", "departed", "cancelled"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {st} <span className="text-[11px] opacity-80 font-mono">({counts[st]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 -mb-4 border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Route & Direction</th>
                <th className="py-3 px-4">Departure</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Fare</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                      {s.origin} → {s.destination}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <p className="font-medium text-slate-700 dark:text-slate-300">{s.departure_date}</p>
                    <p className="text-[11px] text-slate-400">{s.departure_time?.slice(0, 5)} - {s.arrival_time?.slice(0, 5)}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    {s.vehicle_name}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <span className="font-bold font-mono text-brand-600 dark:text-brand-400">{s.available_seats}</span>
                    <span className="text-slate-400">/{s.total_seats} left</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold text-slate-800 dark:text-slate-200">
                    ₱{Number(s.price).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        to={`/schedules/${s.id}`}
                        title="View Seat Map & Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(s.id)}
                        title="Delete Schedule"
                        className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Calendar className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No schedules found</p>
                      {(search || selectedStatus !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setSelectedStatus("all");
                          }}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-1 py-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>Showing {filtered.length} of {schedules?.length ?? 0} transit schedules</span>
          <span>Automatic inventory sync</span>
        </div>
      </div>
    </div>
  );
}
