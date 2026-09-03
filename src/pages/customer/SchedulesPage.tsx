import { useEffect, useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  RotateCcw,
  ChevronRight,
  Bus,
} from "lucide-react";
import { scheduleService } from "@/services/scheduleService";
import { supabase } from "@/services/supabase";
import type { ScheduleFilters } from "@/types/schedule";

function formatTripDate(dateStr?: string) {
  if (!dateStr) return "All Upcoming Dates";
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

export function SchedulesPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [origin, setOrigin] = useState(searchParams.get("origin") ?? "");
  const [destination, setDestination] = useState(searchParams.get("destination") ?? "");
  const [selectedDate, setSelectedDate] = useState(searchParams.get("date") ?? "");
  const [vehicleType, setVehicleType] = useState<"van" | "bus">("van");

  const filters: ScheduleFilters = useMemo(
    () => ({
      origin: origin || undefined,
      destination: destination || undefined,
      date: selectedDate || undefined,
    }),
    [origin, destination, selectedDate]
  );

  const { data: rawSchedules, isLoading, error } = useQuery({
    queryKey: ["schedules", filters],
    queryFn: () => scheduleService.list(filters),
  });

  useEffect(() => {
    document.title = "Available Schedules — SeqBook";
  }, []);

  useEffect(() => {
    setOrigin(searchParams.get("origin") ?? "");
    setDestination(searchParams.get("destination") ?? "");
    setSelectedDate(searchParams.get("date") ?? "");
  }, [searchParams]);

  useEffect(() => {
    const channel = supabase
      .channel("schedules-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedules" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["schedules"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["schedules"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const dateOptions = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayName = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      const monthName = d.toLocaleDateString("en-US", { month: "short" });
      dates.push({ iso, dayName, dayNum, monthName });
    }
    return dates;
  }, []);

  function handleSwapLocations() {
    const nextOrigin = destination;
    const nextDest = origin;
    setOrigin(nextOrigin);
    setDestination(nextDest);
    const newParams = new URLSearchParams(searchParams);
    if (nextDest) newParams.set("destination", nextDest);
    else newParams.delete("destination");
    if (nextOrigin) newParams.set("origin", nextOrigin);
    else newParams.delete("origin");
    setSearchParams(newParams);
  }

  function handleDateSelect(iso: string) {
    const nextDate = selectedDate === iso ? "" : iso;
    setSelectedDate(nextDate);
    const newParams = new URLSearchParams(searchParams);
    if (nextDate) newParams.set("date", nextDate);
    else newParams.delete("date");
    setSearchParams(newParams);
  }

  function handleResetFilters() {
    setOrigin("");
    setDestination("");
    setSelectedDate("");
    setVehicleType("van");
    setSearchParams(new URLSearchParams());
  }

  const processedSchedules = useMemo(() => {
    if (!rawSchedules) return [];
    let list = [...rawSchedules];

    if (vehicleType === "van") {
      list = list.filter(
        (s) =>
          s.vehicle_name.toLowerCase().includes("van") ||
          s.vehicle_name.toLowerCase().includes("hiace") ||
          s.total_seats <= 20
      );
    } else {
      list = list.filter(
        (s) =>
          s.vehicle_name.toLowerCase().includes("bus") ||
          s.vehicle_name.toLowerCase().includes("ceres") ||
          s.vehicle_name.toLowerCase().includes("shuttle") ||
          s.total_seats > 20
      );
    }

    list.sort((a, b) => a.departure_time.localeCompare(b.departure_time));

    return list;
  }, [rawSchedules, vehicleType]);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto px-2 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Available Trips & Schedules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Real-time seat availability across Bohol transit lines.
          </p>
        </div>
        {(origin || destination || selectedDate) && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold hover:underline self-start sm:self-auto bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <RotateCcw size={13} /> Reset Filters
          </button>
        )}
      </div>

      <div className="card p-4 sm:p-6 space-y-4 border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-11 gap-2.5 items-center">
          <div className="sm:col-span-5 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <MapPin size={17} className="text-slate-700 dark:text-slate-300 shrink-0" />
            <div className="w-full">
              <span className="text-[10px] uppercase font-black text-slate-400 block leading-none mb-1">
                From Terminal
              </span>
              <input
                placeholder="Origin city/terminal"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>

          <div className="sm:col-span-1 flex justify-center">
            <button
              type="button"
              onClick={handleSwapLocations}
              title="Swap origin and destination"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          <div className="sm:col-span-5 flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <MapPin size={17} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div className="w-full">
              <span className="text-[10px] uppercase font-black text-slate-400 block leading-none mb-1">
                To Destination
              </span>
              <input
                placeholder="Destination terminal"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="pt-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-slate-500" />
              <span className="text-xs font-black text-slate-900 dark:text-slate-100">
                Chosen Travel Date:
              </span>
              <span className="text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {formatTripDate(selectedDate)}
              </span>
            </div>

            {selectedDate && (
              <button
                type="button"
                onClick={() => handleDateSelect("")}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
              >
                Clear Date Filter
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => handleDateSelect("")}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[75px] py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                !selectedDate
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              }`}
            >
              <span>Any</span>
              <span className="text-sm font-black mt-0.5">Date</span>
            </button>

            {dateOptions.map((item) => {
              const active = selectedDate === item.iso;
              return (
                <button
                  key={item.iso}
                  type="button"
                  onClick={() => handleDateSelect(item.iso)}
                  className={`shrink-0 flex flex-col items-center justify-center min-w-[70px] sm:min-w-[76px] py-2 px-2.5 rounded-xl border transition-all ${
                    active
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 border-slate-900 dark:border-slate-100 shadow-xs scale-102"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span className={`text-[10px] font-bold leading-none ${active ? "text-slate-300 dark:text-slate-700" : "text-slate-400"}`}>
                    {item.dayName}
                  </span>
                  <span className="text-base sm:text-lg font-black leading-tight mt-0.5 font-mono">
                    {item.dayNum}
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider ${active ? "text-slate-300 dark:text-slate-700" : "text-slate-400"}`}>
                    {item.monthName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setVehicleType("van")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vehicleType === "van"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Express Vans (15 Seats)
          </button>
          <button
            type="button"
            onClick={() => setVehicleType("bus")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vehicleType === "bus"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Buses (45 Seats)
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-5 h-44 animate-pulse bg-slate-100/70 dark:bg-slate-900" />
          ))}
        </div>
      )}

      {error && (
        <div className="card p-8 text-center text-red-500 text-sm">
          Failed to load schedule inventory. Please try again.
        </div>
      )}

      {!isLoading && processedSchedules.length === 0 && (
        <div className="card p-10 text-center space-y-3 border-slate-200 dark:border-slate-800">
          <Bus size={32} className="mx-auto text-slate-400" />
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            No scheduled trips found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try choosing a different date, clearing terminal filters, or selecting another fleet type.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="btn-secondary !py-2 !px-4 text-xs font-bold"
          >
            Show All Upcoming Trips
          </button>
        </div>
      )}

      <div key={`${vehicleType}-${selectedDate}`} className="grid sm:grid-cols-2 gap-4 animate-page-fade">
        {processedSchedules.map((schedule) => {
          const isBus =
            schedule.vehicle_name.toLowerCase().includes("bus") ||
            schedule.vehicle_name.toLowerCase().includes("ceres") ||
            schedule.vehicle_name.toLowerCase().includes("shuttle") ||
            schedule.total_seats > 20;

          const isFull = schedule.available_seats <= 0;
          const isLow = schedule.available_seats > 0 && schedule.available_seats <= 4;

          return (
            <div
              key={schedule.id}
              className="card card-hover p-4 sm:p-5 flex flex-col justify-between border-slate-200 dark:border-slate-800 shadow-sm"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isBus
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {isBus ? "Ceres / Bus" : "Express Van"}
                    </span>
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 tracking-wider">
                      {schedule.vehicle_number}
                    </span>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      isFull
                        ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900"
                        : isLow
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900 animate-pulse"
                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900"
                    }`}
                  >
                    {isFull
                      ? "Sold Out"
                      : `${schedule.available_seats} of ${schedule.total_seats} seats free`}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="font-mono text-2xl sm:text-3xl font-black text-slate-950 dark:text-white block leading-tight">
                        {schedule.departure_time.slice(0, 5)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        {schedule.origin}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-2">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                        Direct
                      </span>
                      <div className="w-12 sm:w-16 h-0.5 bg-slate-200 dark:bg-slate-700 my-1 relative">
                        <ArrowRight
                          size={12}
                          className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {schedule.total_seats} Seats
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-2xl sm:text-3xl font-black text-slate-950 dark:text-white block leading-tight">
                        {schedule.arrival_time.slice(0, 5)}
                      </span>
                      <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                        {schedule.destination}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Calendar size={12} />
                      {formatTripDate(schedule.departure_date)}
                    </span>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      {schedule.vehicle_name}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3.5 mt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-0.5">
                    Trip Fare
                  </span>
                  <span className="text-xl font-black font-mono text-slate-950 dark:text-white">
                    ₱{Number(schedule.price).toFixed(2)}
                  </span>
                </div>

                <Link
                  to={`/schedules/${schedule.id}`}
                  className="btn-primary !py-2 !px-4 text-xs font-black flex items-center gap-1 shadow-sm active:scale-95"
                >
                  Select Seat <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
