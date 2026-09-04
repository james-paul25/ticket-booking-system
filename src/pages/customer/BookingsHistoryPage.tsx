import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Ship, ArrowRight, Calendar, Ticket, ChevronRight } from "lucide-react";
import { bookingService } from "@/services/bookingService";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ActivityTab = "upcoming" | "completed" | "cancelled" | "all";

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

export function BookingsHistoryPage() {
  const [activeTab, setActiveTab] = useState<ActivityTab>("upcoming");
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: bookingService.listMine,
  });

  const filteredBookings = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (activeTab === "all") return true;
      if (activeTab === "upcoming") {
        return b.booking_status === "confirmed" || b.booking_status === "pending";
      }
      if (activeTab === "completed") {
        return b.booking_status === "completed";
      }
      if (activeTab === "cancelled") {
        return b.booking_status === "cancelled" || b.booking_status === "failed";
      }
      return true;
    });
  }, [bookings, activeTab]);

  const upcomingCount = bookings?.filter(
    (b) => b.booking_status === "confirmed" || b.booking_status === "pending"
  ).length ?? 0;

  const tabs: { key: ActivityTab; label: string; badge?: number }[] = [
    { key: "upcoming", label: "Upcoming Sailings", badge: upcomingCount > 0 ? upcomingCount : undefined },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "all", label: "All Activity" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in px-2 py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Activity & Bookings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage your sea transit passes, boarding history, and ticket receipts.
          </p>
        </div>
        <Link
          to="/schedules"
          className="btn-primary !py-2.5 !px-5 text-xs font-black self-start sm:self-auto flex items-center gap-2 shadow-xs"
        >
          <Ship size={15} /> Book New Voyage
        </Link>
      </div>

      <div className="flex gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 font-mono font-black">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-6 h-36 animate-pulse bg-slate-100/80 dark:bg-slate-900" />
          ))}
        </div>
      )}

      {!isLoading && filteredBookings.length === 0 && (
        <div className="card p-10 text-center space-y-3 border-slate-200 dark:border-slate-800 shadow-xs">
          <Ticket size={36} className="mx-auto text-slate-400" />
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
            No {activeTab} bookings found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Ready to plan your next voyage? Browse available sea routes and book your seat with instant confirmation.
          </p>
          <Link to="/schedules" className="btn-primary !py-2.5 !px-5 text-xs font-black inline-flex">
            Browse All Schedules
          </Link>
        </div>
      )}

      <div key={activeTab} className="space-y-3.5 animate-page-fade">
        {filteredBookings.map((booking) => {
          const isRoro =
            booking.schedule?.vehicle_name.toLowerCase().includes("roro") ||
            booking.schedule?.vehicle_name.toLowerCase().includes("liner") ||
            booking.schedule?.vehicle_name.toLowerCase().includes("vessel") ||
            (booking.schedule?.total_seats ?? 0) > 150;

          return (
            <div
              key={booking.id}
              className="card card-hover p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="space-y-3.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isRoro
                          ? "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {booking.schedule?.vehicle_name}
                    </span>

                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950 tracking-wider">
                      {booking.schedule?.vehicle_number}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-400">
                      Ref #{booking.booking_reference}
                    </span>
                    <StatusBadge status={booking.booking_status} />
                  </div>
                </div>

                <div className="flex items-baseline justify-between max-w-lg">
                  <div>
                    <span className="font-mono text-2xl font-black text-slate-950 dark:text-white block leading-tight">
                      {booking.schedule?.departure_time?.slice(0, 5)}
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {booking.schedule?.origin}
                    </span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      Direct
                    </span>
                    <div className="w-12 sm:w-16 h-0.5 bg-slate-200 dark:bg-slate-700 my-1 relative">
                      <ArrowRight
                        size={12}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      Non-Stop
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-2xl font-black text-slate-950 dark:text-white block leading-tight">
                      {booking.schedule?.arrival_time?.slice(0, 5)}
                    </span>
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      {booking.schedule?.destination}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="inline-flex items-center gap-1 font-medium">
                    <Calendar size={13} className="text-slate-400" />
                    {formatTripDate(booking.schedule?.departure_date)}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-mono font-black text-emerald-800 dark:text-emerald-300">
                    Seat {booking.seat?.seat_number}
                  </span>
                  <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs">
                    ₱{Number(booking.total_amount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex sm:flex-col items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                <Link
                  to={`/booking/${booking.id}/confirmation`}
                  className="btn-primary !py-2 !px-4 text-xs font-black inline-flex items-center justify-center gap-1.5 w-full shadow-xs"
                >
                  <Ticket size={14} /> Boarding Pass
                </Link>
                <Link
                  to={`/bookings/${booking.id}`}
                  className="btn-secondary !py-2 !px-3 text-xs font-bold inline-flex items-center justify-center gap-1 w-full"
                >
                  Details <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}