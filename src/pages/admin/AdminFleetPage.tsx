import { useQuery } from "@tanstack/react-query";
import { Ship, Radio, Gauge, Anchor, Clock } from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { BoholTransitMap } from "@/components/map/BoholTransitMap";

export function AdminFleetPage() {
  const { data: schedules = [] } = useQuery({
    queryKey: ["admin-fleet-schedules"],
    queryFn: () => scheduleService.list(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fleet AIS & Maritime Tracking
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live AIS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time Bohol Sea vessel monitoring, speed telemetry (knots), and strictly guided nautical sea lanes.
          </p>
        </div>

        {/* Sync status indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Position sync: <strong>Every 1 min</strong></span>
          </div>
        </div>
      </div>

      {/* KPI metric summary pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Active Vessels</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">5 Ferries</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Sea Corridors</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">4 Lanes</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Cruising Speed</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">18–24.5 kts</div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Monitored Piers</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">5 Terminals</div>
          </div>
        </div>
      </div>

      {/* Interactive Map Component with showVessels={true} */}
      <div className="card p-2 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
        <BoholTransitMap schedules={schedules} showVessels={true} />
      </div>

      {/* Fleet Map Legend & Telemetry Status */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Passenger Terminals (5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-blue-600 border border-blue-600 border-dashed flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Designated Sea Lanes (4)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Active AIS Fleet Telemetry</span>
          </div>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
          Telemetry interval: 60 seconds · Real-time speed (knots)
        </div>
      </div>
    </div>
  );
}
