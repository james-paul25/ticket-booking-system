import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ship,
  Radio,
  Anchor,
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

function InteractiveClockDial({
  sliderMinutes,
  onChange,
}: {
  sliderMinutes: number;
  onChange: (minutes: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingMinutesRef = useRef<number | null>(null);
  const lastDegRef = useRef<number | null>(null);
  const accumMinutesRef = useRef<number>(sliderMinutes);

  useEffect(() => {
    if (!isDraggingRef.current) {
      accumMinutesRef.current = sliderMinutes;
    }
  }, [sliderMinutes]);

  const h = Math.floor(sliderMinutes / 60);
  const m = sliderMinutes % 60;
  const isPM = h >= 12;
  const h12 = h % 12 || 12;

  // Angles:
  // Hour hand: 30 deg per hour + 0.5 deg per minute
  const hourAngle = ((h12 % 12) + m / 60) * 30;
  // Minute hand: 6 deg per minute
  const minuteAngle = m * 6;

  const getAngleFromEvent = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (deg < 0) deg += 360;
    return deg;
  }, []);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.preventDefault();
    isDraggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const deg = getAngleFromEvent(e);
    if (deg !== null) {
      lastDegRef.current = deg;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const deg = getAngleFromEvent(e);
    if (deg === null) return;

    if (lastDegRef.current !== null) {
      let dDeg = deg - lastDegRef.current;
      if (dDeg > 180) dDeg -= 360;
      if (dDeg < -180) dDeg += 360;

      // 360 deg on 12-hour face = 720 minutes (12 hours)
      const dMins = (dDeg / 360) * 720;
      accumMinutesRef.current += dMins;

      // Wrap in 24 hours (0 to 1439 minutes)
      let wrapped = accumMinutesRef.current % 1440;
      if (wrapped < 0) wrapped += 1440;

      const snapped = Math.round(wrapped / 5) * 5 % 1440;
      pendingMinutesRef.current = snapped;

      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          if (pendingMinutesRef.current !== null) {
            onChange(pendingMinutesRef.current);
          }
          rafRef.current = null;
        });
      }
    }
    lastDegRef.current = deg;
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    isDraggingRef.current = false;
    lastDegRef.current = null;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (pendingMinutesRef.current !== null) {
      onChange(pendingMinutesRef.current);
      pendingMinutesRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleHourClick = (selectedHour: number) => {
    const finalH = isPM
      ? selectedHour === 12
        ? 12
        : selectedHour + 12
      : selectedHour === 12
      ? 0
      : selectedHour;
    onChange(finalH * 60 + m);
  };

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
      {/* SVG Analog Clock Face */}
      <div className="relative select-none touch-none">
        <svg
          ref={svgRef}
          viewBox="0 0 200 200"
          className="w-44 h-44 cursor-grab active:cursor-grabbing drop-shadow-sm"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          role="slider"
          aria-label="Interactive clock dial"
          aria-valuenow={sliderMinutes}
        >
          {/* Dial Background */}
          <circle
            cx="100"
            cy="100"
            r="94"
            className="fill-slate-50 dark:fill-slate-800/60 stroke-slate-200 dark:stroke-slate-700"
            strokeWidth="2"
          />
          <circle
            cx="100"
            cy="100"
            r="82"
            className="fill-white dark:fill-slate-900 stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="1.5"
          />

          {/* Minute tick marks (every 5 min) */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x1 = 100 + 78 * Math.sin(angle);
            const y1 = 100 - 78 * Math.cos(angle);
            const x2 = 100 + 82 * Math.sin(angle);
            const y2 = 100 - 82 * Math.cos(angle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className="stroke-slate-300 dark:stroke-slate-600"
                strokeWidth={i % 3 === 0 ? "2" : "1"}
              />
            );
          })}

          {/* Hour Numbers around dial */}
          {hours.map((hr, idx) => {
            const angle = (idx * 30 * Math.PI) / 180;
            const radius = 64;
            const x = 100 + radius * Math.sin(angle);
            const y = 100 - radius * Math.cos(angle) + 4;
            const isCurrent = h12 === hr;
            return (
              <g
                key={hr}
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleHourClick(hr);
                }}
              >
                {isCurrent && (
                  <circle
                    cx={x}
                    cy={y - 4}
                    r="11"
                    className="fill-blue-50 dark:fill-blue-950/60 stroke-blue-500/40"
                    strokeWidth="1"
                  />
                )}
                <text
                  x={x}
                  y={y}
                  textAnchor="middle"
                  className={`text-[11px] font-bold ${
                    isCurrent
                      ? "fill-blue-600 dark:fill-blue-400"
                      : "fill-slate-600 dark:fill-slate-400 hover:fill-blue-600"
                  } select-none`}
                >
                  {hr}
                </text>
              </g>
            );
          })}

          {/* Hour Hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + 40 * Math.sin((hourAngle * Math.PI) / 180)}
            y2={100 - 40 * Math.cos((hourAngle * Math.PI) / 180)}
            className="stroke-slate-800 dark:stroke-slate-200"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Minute Hand */}
          <line
            x1="100"
            y1="100"
            x2={100 + 60 * Math.sin((minuteAngle * Math.PI) / 180)}
            y2={100 - 60 * Math.cos((minuteAngle * Math.PI) / 180)}
            className="stroke-blue-600 dark:stroke-blue-400"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Pivot Dot */}
          <circle cx="100" cy="100" r="4.5" className="fill-blue-600" />
          <circle cx="100" cy="100" r="2" className="fill-white" />
        </svg>
      </div>

      {/* Digital Readout, AM/PM Toggle, and Fine Adjustments */}
      <div className="flex flex-col items-center sm:items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {String(h12).padStart(2, "0")}:{String(m).padStart(2, "0")}
          </div>

          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                if (isPM) onChange(sliderMinutes - 720);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                !isPM
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              AM
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isPM) onChange(sliderMinutes + 720);
              }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                isPM
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              PM
            </button>
          </div>
        </div>

        {/* Nudge Buttons */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onChange(Math.max(0, sliderMinutes - 15))}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Step back 15 minutes"
          >
            -15m
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.max(0, sliderMinutes - 5))}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Step back 5 minutes"
          >
            -5m
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(1439, sliderMinutes + 5))}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Advance 5 minutes"
          >
            +5m
          </button>
          <button
            type="button"
            onClick={() => onChange(Math.min(1439, sliderMinutes + 15))}
            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Advance 15 minutes"
          >
            +15m
          </button>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Click hours or drag needles on the clock face to scrub timetables
        </p>
      </div>
    </div>
  );
}

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
    <div className="space-y-6 [scrollbar-gutter:stable]">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Fleet AIS & Maritime Tracking
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time Bohol Sea vessel monitoring, timetable-driven voyages, and strict nautical sea corridors.
        </p>
      </div>

      {/* KPI metric summary cards (3 clean cards without Cruising Speed card) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Time Control Bar: Interactive Clock & Rush hour presets */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                Timetable Vessel Tracker & Time Machine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              (Evaluate ship positions along route waypoints at any hour)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={handleResetToLive}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
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

        {/* The Interactive Clock */}
        <InteractiveClockDial
          sliderMinutes={sliderMinutes}
          onChange={(newM) => {
            setIsLive(false);
            setSliderMinutes(newM);
          }}
        />
      </div>

      {/* Bohol Sea Transit Map with Fleet AIS telemetry (Fullscreen & smooth expand supported) */}
      <BoholTransitMap
        schedules={schedules}
        showVessels={true}
        twoState={true}
        simulatedTime={simulatedDate}
      />

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
      </div>
    </div>
  );
}
