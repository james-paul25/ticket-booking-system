import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function AdminSchedulesPage() {
  const queryClient = useQueryClient();
  const { data: schedules } = useQuery({ queryKey: ["schedules", {}], queryFn: () => scheduleService.list() });

  async function handleDelete(id: string) {
    if (!confirm("Cancel/delete this schedule?")) return;
    await scheduleService.remove(id);
    queryClient.invalidateQueries({ queryKey: ["schedules"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage Schedules</h1>
        <Link to="/admin/schedules/create" className="btn-primary">
          <Plus size={16} /> Add Schedule
        </Link>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Route</th>
              <th className="p-3">Date</th>
              <th className="p-3">Vehicle</th>
              <th className="p-3">Seats</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {schedules?.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">
                  {s.origin} → {s.destination}
                </td>
                <td className="p-3">{s.departure_date}</td>
                <td className="p-3">{s.vehicle_name}</td>
                <td className="p-3">
                  {s.available_seats}/{s.total_seats}
                </td>
                <td className="p-3">₱{Number(s.price).toFixed(2)}</td>
                <td className="p-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
