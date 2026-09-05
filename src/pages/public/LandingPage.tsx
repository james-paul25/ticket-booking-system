import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Compass,
  Ship,
  Clock,
  CheckCircle2,
  ChevronRight,
  Info,
  Luggage,
  QrCode,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { supabase } from "@/services/supabase";

function formatTripDate(dateStr?: string) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTripTime(timeStr?: string) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

const POPULAR_ROUTES = [
  {
    origin: "Tagbilaran Port",
    dest: "Cebu Pier 1",
    fare: "₱250.00",
    duration: "2h 00m",
    vesselType: "Fastcraft",
    tag: "Busiest Route",
  },
  {
    origin: "Tubigon Port",
    dest: "Cebu Pier 1",
    fare: "₱85.00",
    duration: "1h 15m",
    vesselType: "Express RoRo",
    tag: "Fastest Crossing",
  },
  {
    origin: "Tagbilaran Port",
    dest: "Jagna Port",
    fare: "₱150.00",
    duration: "1h 45m",
    vesselType: "Fastcraft",
    tag: "Southern Passage",
  },
  {
    origin: "Tagbilaran Port",
    dest: "Ubay Port",
    fare: "₱220.00",
    duration: "2h 30m",
    vesselType: "Fastliner",
    tag: "Eastern Gateway",
  },
  {
    origin: "Jagna Port",
    dest: "Cagayan de Oro Port",
    fare: "₱400.00",
    duration: "6h 00m",
    vesselType: "Light Ferries",
    tag: "Busiest Route",
  }
];

import { BoholTransitMap } from "@/components/map/BoholTransitMap";

export function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["home-recommended-schedules"],
    queryFn: () => scheduleService.list({ onlyAvailable: true }),
  });

  useEffect(() => {
    const channel = supabase
      .channel("landing-realtime-inventory")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["home-recommended-schedules"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["home-recommended-schedules"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div
      className="space-y-12 sm:space-y-16 py-2 sm:py-4 w-full"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* ─── 1. Interactive Bohol Sea Transit Map ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold w-fit mb-2.5">
              <Compass size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Interactive Bohol Sea Fastcraft Transit Network</span>
            </div>
            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.15]"
              style={{ letterSpacing: "-0.03em" }}
            >
              Explore Bohol Crossings & Sea Routes
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Plan your crossing using this interactive map. Select passenger piers, view sea routes, and reserve confirmed seats instantly.
            </p>
          </div>
        </div>

        {/* MapLibre Interactive Transit Map (Customer Mode: Routes & Piers Only) */}
        <BoholTransitMap schedules={schedules} showVessels={false} />
      </section>

      {/* ─── 2. Popular Routes Quick Selector ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Direct Crossings
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              Popular Bohol Sea Crossings
            </h2>
          </div>
          <Link
            to="/schedules"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 hover:underline"
          >
            All routes <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {POPULAR_ROUTES.map((r) => (
            <button
              key={r.origin + r.dest}
              type="button"
              onClick={() =>
                navigate(`/schedules?origin=${encodeURIComponent(r.origin)}&destination=${encodeURIComponent(r.dest)}`)
              }
              className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500/60 dark:hover:border-blue-500/60 hover:shadow-md text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                    {r.vesselType}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500 font-medium">{r.duration}</span>
                </div>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {r.origin}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 my-0.5">
                  <ArrowRight size={12} />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{r.dest}</span>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{r.tag}</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{r.fare}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ─── 3. Live Active Sailings ─── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Live Inventory
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {schedules?.length ?? 0} active sailings
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
              Next Upcoming Departures
            </h2>
          </div>

          <Link
            to="/schedules"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 hover:underline"
          >
            View full timetable <ArrowRight size={13} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : schedules && schedules.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
            {schedules.slice(0, 4).map((s) => (
              <div
                key={s.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                        {s.vehicle_name}
                      </span>
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {formatTripDate(s.departure_date)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                      <span>{s.origin}</span>
                      <ArrowRight size={14} className="text-slate-400 dark:text-slate-500 shrink-0" />
                      <span>{s.destination}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-bold text-base text-blue-600 dark:text-blue-400 block">
                      ₱{Number(s.price).toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">per seat</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                      <Clock size={13} className="text-slate-400 dark:text-slate-500" />
                      {formatTripTime(s.departure_time)}
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900">
                      <CheckCircle2 size={12} />
                      {s.available_seats} seats free
                    </span>
                  </div>

                  <Link
                    to={`/booking/${s.id}`}
                    className="py-1.5 px-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1"
                  >
                    Select Seat <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium">
            No upcoming departures matching criteria. Browse all schedules to check available dates.
          </div>
        )}
      </section>

      {/* ─── 4. Passenger Travel Guidelines (Clean Real-World Utility, No Slop) ─── */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Traveler Information
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
            Port Guidelines & Boarding Advisory
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Terminal Check-In
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Arrive at the passenger terminal at least 45 minutes before departure for security check and manifest verification.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Terminal Fee
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard PPA terminal fee (₱25.00) is paid directly at the terminal entrance counter prior to entering the passenger lounge.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Luggage size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Baggage Allowance
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Standard 15 kg of hand carry is included per passenger ticket. Oversized parcels and freight can be settled at the cargo desk.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrCode size={16} />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Digital E-Ticket
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Present your confirmed booking pass QR code directly on your mobile device at the gate turnstiles for fast boarding.
            </p>
          </div>
        </div>
      </section>

      {/* ─── 5. Minimalist Footer ─── */}
      <footer className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center">
            <Ship size={11} />
          </div>
          <span className="font-semibold text-slate-700 dark:text-slate-300">SeqBook Bohol Sea Transit</span>
          <span>·</span>
          <span>Bohol Maritime Passenger Operations</span>
        </div>
        <p>© 2026 SeqBook. All rights reserved.</p>
      </footer>
    </div>
  );
}