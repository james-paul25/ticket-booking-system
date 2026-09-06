import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Ship,
  Clock,
  ChevronRight,
  Info,
  Luggage,
  QrCode,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { supabase } from "@/services/supabase";
import { BoholTransitMap } from "@/components/map/BoholTransitMap";

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
    fare: "₱800.00",
    duration: "2h 00m",
    vesselType: "OceanJet Fastcraft",
    tag: "Busiest Corridor",
  },
  {
    origin: "Tubigon Port",
    dest: "Cebu Pier 1",
    fare: "₱360.00",
    duration: "1h 45m",
    vesselType: "FastCat / Lite Ferry",
    tag: "Frequent Sailings",
  },
  {
    origin: "Port of Getafe",
    dest: "Cordova RORO Port",
    fare: "₱300.00",
    duration: "1h 15m",
    vesselType: "Island Water Fastcraft",
    tag: "Direct Mactan Gateway",
  },
  {
    origin: "Tagbilaran Port",
    dest: "Larena Port",
    fare: "₱650.00",
    duration: "1h 30m",
    vesselType: "OceanJet Fastcraft",
    tag: "Siquijor Passage",
  },
  {
    origin: "Jagna Port",
    dest: "Cagayan de Oro Port",
    fare: "₱400.00",
    duration: "6h 00m",
    vesselType: "Light Ferries",
    tag: "Busiest Route",
  },
  {
    origin: "Jagna Port",
    dest: "Balbagon Port",
    fare: "₱600.00",
    duration: "3h 30m",
    vesselType: "Super Shuttle RoRo",
    tag: "Camiguin Corridor",
  },
  {
    origin: "Ubay Port",
    dest: "Bato Port",
    fare: "₱380.00",
    duration: "2h 15m",
    vesselType: "Medallion RoRo",
    tag: "Eastern Leyte Link",
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

const TARGET_TITLE = "Explore Bohol Crossings & Sea Routes";
const TARGET_SUBTITLE =
  "Plan your crossing using this interactive map. Select passenger piers, view sea routes, and reserve confirmed seats instantly.";

export function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Slow smooth fade-in state
  const [mounted, setMounted] = useState(false);

  // Typewriter effect state
  const [titleChars, setTitleChars] = useState(0);
  const [subtitleChars, setSubtitleChars] = useState(0);

  useEffect(() => {
    // Always start at the very top of the page on refresh or load
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });

    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 1. Trigger very nice slow fade-in on mount / page load
    const mountTimer = setTimeout(() => {
      setMounted(true);
    }, 60);

    // 2. Start typewriter effect after graceful fade-in initiation
    const typeTimer = setTimeout(() => {
      let tIdx = 0;
      const titleInterval = setInterval(() => {
        tIdx++;
        setTitleChars(tIdx);
        if (tIdx >= TARGET_TITLE.length) {
          clearInterval(titleInterval);

          // Brief natural pause before typing subtitle
          setTimeout(() => {
            let sIdx = 0;
            const subInterval = setInterval(() => {
              sIdx++;
              setSubtitleChars(sIdx);
              if (sIdx >= TARGET_SUBTITLE.length) {
                clearInterval(subInterval);
              }
            }, 18);
          }, 180);
        }
      }, 34);
    }, 450);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearTimeout(mountTimer);
      clearTimeout(typeTimer);
    };
  }, []);

  const { data: schedules } = useQuery({
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

  // Next Upcoming Departures (top 6 upcoming departures for today/soonest)
  const upcomingDepartures = useMemo(() => {
    if (!schedules || schedules.length === 0) return [];
    return schedules.slice(0, 6);
  }, [schedules]);

  return (
    <div
      className={`space-y-10 sm:space-y-14 py-2 sm:py-4 w-full transition-opacity duration-[1200ms] ease-out ${
        mounted ? "opacity-100" : "opacity-0"
      }`}
      style={{
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        willChange: "opacity",
      }}
    >
      {/* ─── 1. Interactive Bohol Sea Transit Map & Hero ─── */}
      <section className="space-y-4">
        <div>
          {/* Big Title with Typewriter Reveal & Invisible Layout-Shift Prevention */}
          <h1
            className="relative text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-[1.12]"
            style={{ letterSpacing: "-0.03em" }}
          >
            {/* Phantom copy reserving exact bounding dimensions to guarantee zero layout shift */}
            <span className="invisible select-none pointer-events-none block" aria-hidden="true">
              {TARGET_TITLE}
            </span>
            <span className="absolute inset-0 block">
              {TARGET_TITLE.slice(0, titleChars)}
              {titleChars < TARGET_TITLE.length && (
                <span className="inline-block w-[3.5px] h-[0.85em] bg-blue-600 ml-1.5 align-baseline animate-pulse rounded-xs" />
              )}
            </span>
          </h1>

          {/* Subtitle with Typewriter Reveal */}
          <p className="relative text-xs sm:text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mt-2.5">
            <span className="invisible select-none pointer-events-none block" aria-hidden="true">
              {TARGET_SUBTITLE}
            </span>
            <span className="absolute inset-0 block">
              {TARGET_SUBTITLE.slice(0, subtitleChars)}
              {titleChars >= TARGET_TITLE.length && subtitleChars < TARGET_SUBTITLE.length && (
                <span className="inline-block w-[2px] h-[0.85em] bg-blue-500 ml-1 align-baseline animate-pulse" />
              )}
            </span>
          </p>
        </div>

        {/* MapLibre Interactive Transit Map (Customer Mode: Routes & Piers Only) */}
        <BoholTransitMap schedules={schedules} showVessels={false} />

        {/* ─── Highly Useful Next Upcoming Departures: Real-Time Departures Board ─── */}
        <div className="pt-2">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">
                      Next Upcoming Departures
                    </h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Board
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Real-time scheduled crossings leaving soonest with calculated ETAs
                  </p>
                </div>
              </div>

              <Link
                to="/schedules"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 hover:underline self-start sm:self-auto"
              >
                <span>View all 15 sea routes & full timetable</span>
                <ChevronRight size={13} />
              </Link>
            </div>

            {/* Departures Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingDepartures.map((s) => {
                const arrFormatted = formatTripTime(s.arrival_time);
                return (
                  <div
                    key={s.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                          {s.vehicle_name}
                        </span>
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          On Time
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                        <span>{s.origin}</span>
                        <ArrowRight size={11} className="text-slate-400 shrink-0" />
                        <span>{s.destination}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-slate-400 dark:text-slate-500" />
                          <span>{formatTripDate(s.departure_date)} · <strong className="text-slate-800 dark:text-slate-200">{formatTripTime(s.departure_time)}</strong></span>
                        </div>
                        {arrFormatted && (
                          <div className="text-slate-500 dark:text-slate-400">
                            ETA: <strong className="text-blue-600 dark:text-blue-400">{arrFormatted}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                      <div>
                        <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                          ₱{Number(s.price).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-none">
                          {s.available_seats} seats free
                        </span>
                      </div>

                      <Link
                        to={`/booking/${s.id}`}
                        className="py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                      >
                        Select Seat <ChevronRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
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

      {/* ─── 3. Passenger Port Guidelines & Boarding Advisory ─── */}
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

      {/* ─── 4. Minimalist Footer ─── */}
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