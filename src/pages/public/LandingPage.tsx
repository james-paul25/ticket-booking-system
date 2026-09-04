import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Search,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
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
    year: "numeric",
  });
}

export function LandingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [fromCity, setFromCity] = useState("Tagbilaran Port");
  const [toCity, setToCity] = useState("");
  const [travelDate, setTravelDate] = useState("");

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (fromCity.trim()) params.set("origin", fromCity.trim());
    if (toCity.trim()) params.set("destination", toCity.trim());
    if (travelDate) params.set("date", travelDate);
    navigate(`/schedules?${params.toString()}`);
  }

  function handleSwap() {
    const temp = fromCity;
    setFromCity(toCity);
    setToCity(temp);
  }

  return (
    <div className="space-y-8 sm:space-y-10 animate-fade-in max-w-5xl mx-auto px-2 py-2">
      <section className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl mx-auto text-center space-y-2 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Where are you sailing next?
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search scheduled ferry and fastcraft trips with instant seat selection across Bohol's waters.
          </p>
        </div>

        <form onSubmit={handleSearch} className="space-y-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-2 sm:gap-3 items-center">
            <div className="md:col-span-5 flex items-center gap-3 px-3.5 sm:px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <MapPin size={18} className="text-slate-700 dark:text-slate-300 shrink-0" />
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block leading-none mb-1">
                  Departure Port
                </label>
                <input
                  type="text"
                  placeholder="Origin port (e.g. Tagbilaran Port)"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-1 flex justify-center">
              <button
                type="button"
                onClick={handleSwap}
                title="Swap origin and destination"
                className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
              >
                <ArrowRightLeft size={16} />
              </button>
            </div>

            <div className="md:col-span-5 flex items-center gap-3 px-3.5 sm:px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <MapPin size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="w-full">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block leading-none mb-1">
                  Arrival Port
                </label>
                <input
                  type="text"
                  placeholder="Destination (e.g. Cebu City, Cagayan De Oro, Siquijor, etc.)"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 items-center">
            <div className="sm:col-span-2 flex items-center gap-3 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
              <Calendar size={18} className="text-slate-500 shrink-0" />
              <div className="w-full flex items-center justify-between">
                <div>
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block leading-none mb-1">
                    Travel Date
                  </label>
                  <input
                    type="date"
                    value={travelDate}
                    onChange={(e) => setTravelDate(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none cursor-pointer"
                  />
                </div>
                {travelDate ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      {formatTripDate(travelDate)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setTravelDate("")}
                      className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] font-medium text-slate-400">
                    All upcoming sailings
                  </span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary !py-3 w-full font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm active:scale-98"
            >
              <Search size={16} /> Search Sailings
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">
              Schedule Inventory
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Explore All Available Sailings
              </h2>
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {schedules?.length ?? 5} routes
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Browse sailing schedules, check live seat availability, and book direct ferry routes across Bohol.
            </p>
          </div>

          <Link
            to="/schedules"
            className="btn-primary !py-3 !px-6 text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-sm shrink-0 self-start sm:self-auto"
          >
            View Full Timetable <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                Fastcraft Fleet
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                150 Passengers Max
              </span>
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                Bohol Fastcraft Ferries
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                High-speed passenger crossings connecting Tagbilaran Port, Jagna Port, and Ubay Port.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Starting from</span>
              <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                ₱150.00
              </span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                RoRo & Inter-Island Fleet
              </span>
              <span className="text-xs font-mono font-bold text-slate-500">
                450 Passenger Vessel
              </span>
            </div>
            <div>
              <h3 className="font-black text-base text-slate-900 dark:text-slate-100">
                RoRo Vessels & Inter-Island Liners
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Spacious roll-on/roll-off routes serving Tubigon Port, Cebu, and Tagbilaran Port.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Starting from</span>
              <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-sm">
                ₱85.00
              </span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-2">
            Popular Direct Sea Routes
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { origin: "Tagbilaran Port", dest: "Jagna Port", fare: "₱150" },
              { origin: "Tagbilaran Port", dest: "Ubay Port", fare: "₱220" },
              { origin: "Tagbilaran Port", dest: "Tubigon Port", fare: "₱85" },
              { origin: "Tagbilaran Port", dest: "Cebu City", fare: "₱250" },
            ].map((route) => (
              <button
                key={route.dest}
                type="button"
                onClick={() => navigate(`/schedules?origin=${route.origin}&destination=${route.dest}`)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-left transition-all group"
              >
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 block group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                  {route.dest}
                </span>
                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                  from {route.fare}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}