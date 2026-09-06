import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ship,
  Radio,
  Gauge,
  Anchor,
  Clock,
  RotateCcw,
  Sunrise,
  Sun,
  Sunset,
  Moon,
  Compass,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { BoholTransitMap } from "@/components/map/BoholTransitMap";
import { BOHOL_PORTS, FERRY_ROUTES } from "@/components/map/nauticalRoutes";
import { computeFleetState } from "@/components/map/ShipFleetOverlay";

export function AdminFleetPage() {
  const { data: schedules = [] } = useQuery({
    queryKey: ["admin-fleet-schedules"],
    queryFn: () => scheduleService.list(),
  });

  // Time control state
  const [isLive, setIsLive] = useState(true);
  const [sliderMinutes, setSliderMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Keep slider synced to wall clock when in Live mode
  useEffect(() => {
    if (!isLive) return;
    const syncTime = () => {
      const now = new Date();
      setSliderMinutes(now.getHours() * 60 + now.getMinutes());
    };
    syncTime();
    const interval = setInterval(syncTime, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Derived simulated Date object
  const simulatedDate = useMemo(() => {
    if (isLive) return null;
    const d = new Date();
    d.setHours(Math.floor(sliderMinutes / 60), sliderMinutes % 60, 0, 0);
    return d;
  }, [isLive, sliderMinutes]);

  // Active fleet telemetry snapshot for real-time KPI metrics
  const fleetSnapshot = useMemo(() => {
    return computeFleetState(simulatedDate || new Date());
  }, [simulatedDate]);

  const underwayCount = fleetSnapshot.filter((v) => v.status === "Underway").length;
  const mooredCount = fleetSnapshot.filter((v) => v.status === "Moored").length;

  // Formatted 12h / 24h clock string
  const formattedTime = useMemo(() => {
    const h = Math.floor(sliderMinutes / 60);
    const m = sliderMinutes % 60;
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  }, [sliderMinutes]);

  // Schedule Traffic Presets
  const trafficPresets = [
    { label: "07:30 AM", sub: "Morning Rush", min: 7 * 60 + 30, icon: Sunrise },
    { label: "10:30 AM", sub: "Midday Crossings", min: 10 * 60 + 30, icon: Sun },
    { label: "03:30 PM", sub: "Afternoon Return", min: 15 * 60 + 30, icon: Sunset },
    { label: "10:30 PM", sub: "Night Passage", min: 22 * 60 + 30, icon: Moon },
  ];

  const handleSelectPreset = (min: number) => {
    setIsLive(false);
    setSliderMinutes(min);
  };

  const handleResetToLive = () => {
    setIsLive(true);
    const now = new Date();
    setSliderMinutes(now.getHours() * 60 + now.getMinutes());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Fleet AIS & Maritime Tracking
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isLive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200/60 dark:border-amber-800"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              {isLive ? "Live AIS Telemetry" : `Simulated: ${formattedTime}`}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time Bohol Sea vessel monitoring, timetable-driven voyages, and strict nautical sea corridors.
          </p>
        </div>

        {/* Sync & Mode Indicator */}
        <div className="flex items-center gap-2">
          {!isLive && (
            <button
              onClick={handleResetToLive}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-200 dark:border-blue-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resume Live AIS</span>
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              Time: <strong>{formattedTime}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* KPI metric summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <Ship className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Monitored Fleet</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>{fleetSnapshot.length} Vessels</span>
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              <strong className="text-emerald-600">{underwayCount}</strong> sailing ·{" "}
              <strong className="text-amber-600">{mooredCount}</strong> moored
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Sea Corridors</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {FERRY_ROUTES.length} Lanes
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              KMZ Verified Tracks
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Cruising Speed</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">18–26 kts</div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Schedule-calculated
            </div>
          </div>
        </div>

        <div className="card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
            <Anchor className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Monitored Piers</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {BOHOL_PORTS.length} Terminals
            </div>
            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
              Bohol & Neighbor Ports
            </div>
          </div>
        </div>
      </div>

      {/* Time Control Bar: Timetable scrubber & Rush hour presets */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold text-slate-900 dark:text-white">
              Timetable Vessel Tracker & Time Machine
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              (Evaluate ship positions along route waypoints at any hour)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={handleResetToLive}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                isLive
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-emerald-500"}`} />
              Live Clock
            </button>

            {trafficPresets.map((p) => {
              const Icon = p.icon;
              const isCurrent = !isLive && Math.abs(sliderMinutes - p.min) < 15;
              return (
                <button
                  key={p.label}
                  onClick={() => handleSelectPreset(p.min)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isCurrent
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                  }`}
                  title={p.sub}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slider */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>00:00 (Midnight)</span>
            <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">
              Selected Time: {formattedTime} · {underwayCount} vessels underway · {mooredCount} docked in port
            </span>
            <span>23:59 (End of Day)</span>
          </div>
          <input
            type="range"
            min={0}
            max={1439}
            step={5}
            value={sliderMinutes}
            onChange={(e) => {
              setIsLive(false);
              setSliderMinutes(Number(e.target.value));
            }}
            className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 dark:bg-slate-700 rounded-lg"
          />
        </div>
      </div>

      {/* Interactive Map Component with showVessels={true} and simulatedTime */}
      <div className="card p-2 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800">
        <BoholTransitMap
          schedules={schedules}
          showVessels={true}
          simulatedTime={simulatedDate}
        />
      </div>

      {/* Fleet Map Legend & Telemetry Status */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-sm flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Passenger Terminals ({BOHOL_PORTS.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-blue-600 border border-blue-600 border-dashed flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Designated Sea Lanes ({FERRY_ROUTES.length})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Underway Ferries ({underwayCount})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 flex-shrink-0" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Moored in Port ({mooredCount})
            </span>
          </div>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
          Deterministic AIS Telemetry · Positions anchored to official timetables
        </div>
      </div>
    </div>
  );
}
