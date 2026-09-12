import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Users,
  Calendar,
  Ticket,
  CreditCard,
  CheckCircle2,
  XCircle,
  PlayCircle,
  Plus,
  ListOrdered,
  Activity,
  ArrowRight,
  Ship,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { bookingService } from "@/services/bookingService";
import { bookingQueueService } from "@/features/queue/bookingQueueService";
import { StatusBadge } from "@/components/ui/StatusBadge";

async function loadStats() {
  const [{ count: users }, { count: schedules }, { count: confirmed }, { count: cancelled }, bookingsToday, revenue] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("schedules").select("id", { count: "exact", head: true }),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("booking_status", "confirmed"),
      supabase.from("bookings").select("id", { count: "exact", head: true }).eq("booking_status", "cancelled"),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
      supabase.from("bookings").select("total_amount").eq("booking_status", "confirmed"),
    ]);

  const totalRevenue = (revenue.data ?? []).reduce((sum, r) => sum + Number(r.total_amount), 0);

  return {
    users: users ?? 0,
    schedules: schedules ?? 0,
    confirmed: confirmed ?? 0,
    cancelled: cancelled ?? 0,
    bookingsToday: bookingsToday.count ?? 0,
    totalRevenue,
  };
}

export function AdminDashboardPage() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: loadStats });
  const { data: queue } = useQuery({
    queryKey: ["admin-queue-snapshot"],
    queryFn: () => bookingQueueService.listAll(),
    refetchInterval: 2000,
  });
  const { data: recentBookings } = useQuery({
    queryKey: ["admin-recent-bookings"],
    queryFn: async () => {
      const all = await bookingService.listAll();
      return all.slice(0, 5);
    },
  });

  const currentlyProcessing = queue?.find((q) => q.status === "processing");
  const pending = queue?.filter((q) => q.status === "waiting").length ?? 0;
  const completed = queue?.filter((q) => q.status === "completed").length ?? 0;
  const failed = queue?.filter((q) => q.status === "failed").length ?? 0;

  return (
    <div data-testid="admin-overview" className="space-y-6 w-full min-w-0">
      {/* ─── Page Header & Action Controls ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
            Admin Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Voyage operations, revenue performance, and sequential queue execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/schedules/create"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200 transition-colors shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Schedule</span>
          </Link>
          <Link
            to="/admin/queue"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ListOrdered className="h-3.5 w-3.5 text-slate-500" />
            <span>View Queue</span>
          </Link>
          <Link
            to="/admin/fleet"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Ship className="h-3.5 w-3.5 text-slate-500" />
            <span>Fleet Tracking</span>
          </Link>
          <Link
            to="/admin/sequential-demo"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <PlayCircle className="h-3.5 w-3.5 text-slate-500" />
            <span>Sequential Demo</span>
          </Link>
        </div>
      </div>

      {/* ─── Operational KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={CreditCard}
          label="Total Revenue"
          value={`₱${(stats?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          badge="Gross"
        />
        <StatCard
          icon={Ticket}
          label="Confirmed Bookings"
          value={stats?.confirmed ?? "—"}
          badge={`${stats?.bookingsToday ?? 0} today`}
        />
        <StatCard
          icon={Calendar}
          label="Active Schedules"
          value={stats?.schedules ?? "—"}
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={stats?.users ?? "—"}
        />
      </div>

      {/* ─── Booking Queue Status (Clean, Operational, No Technical Jargon) ─── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Booking Queue Status
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live state of inbound booking requests and queue throughput.
            </p>
          </div>
          <Link
            to="/admin/processing-logs"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span>Processing Logs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {/* Queued */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Queued Requests
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                FIFO
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {pending}
              </span>
              <span className="text-xs text-slate-500">waiting</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Requests claimed in arrival order.
            </p>
          </div>

          {/* Active Processing Slot */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Execution Slot
              </span>
              {currentlyProcessing ? (
                <StatusBadge status="processing" />
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Idle
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {currentlyProcessing ? `#${currentlyProcessing.request_number}` : "Idle"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {currentlyProcessing
                ? `Allocating Seat ${currentlyProcessing.seat?.seat_number ?? currentlyProcessing.seat_id.slice(0, 8)}`
                : "Ready for next inbound request."}
            </p>
          </div>

          {/* Outcomes */}
          <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Queue Outcomes
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {queue?.length ?? 0} total
              </span>
            </div>
            <div className="flex items-center gap-3 pt-0.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{completed} Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                <XCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{failed} Rejected</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Completed transaction logs.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Recent Bookings Table ─── */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs overflow-hidden w-full min-w-0">
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400 dark:text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Recent Bookings
            </h2>
          </div>
          <Link
            to="/admin/bookings"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
          >
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs min-w-[600px]">
            <thead className="bg-slate-50/70 dark:bg-slate-900/80 text-left font-semibold text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 sm:px-5">Reference</th>
                <th className="py-3 px-3 sm:px-4">Passenger</th>
                <th className="py-3 px-3 sm:px-4">Route</th>
                <th className="py-3 px-3 sm:px-4">Seat</th>
                <th className="py-3 px-3 sm:px-4">Fare</th>
                <th className="py-3 px-3 sm:px-4">Status</th>
                <th className="py-3 px-4 sm:px-5">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {recentBookings?.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 sm:px-5 font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {b.booking_reference}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-medium text-slate-700 dark:text-slate-300">
                    {b.user?.email ?? "Customer"}
                  </td>
                  <td className="py-3 px-3 sm:px-4 text-slate-600 dark:text-slate-400">
                    {b.schedule ? `${b.schedule.origin} → ${b.schedule.destination}` : "—"}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {b.seat?.seat_number ?? "—"}
                  </td>
                  <td className="py-3 px-3 sm:px-4 font-mono text-slate-800 dark:text-slate-200 font-medium">
                    ₱{Number(b.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 sm:px-4">
                    <StatusBadge status={b.booking_status} />
                  </td>
                  <td className="py-3 px-4 sm:px-5 text-slate-400 font-mono">
                    {new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
              {recentBookings?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No bookings recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  badge,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  badge?: string;
}) {
  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
          {value}
        </p>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
