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
  ShieldCheck,
  Zap,
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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time schedules, revenue, and sequential booking execution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/schedules/create"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Schedule</span>
          </Link>
          <Link
            to="/admin/queue"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <ListOrdered className="h-3.5 w-3.5" />
            <span>View Queue</span>
          </Link>
          <Link
            to="/admin/fleet"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <Ship className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>Fleet Tracking</span>
          </Link>
          <Link
            to="/admin/sequential-demo"
            className="btn-primary inline-flex items-center gap-1.5 text-xs py-2 shadow-xs"
          >
            <PlayCircle className="h-4 w-4" />
            <span>5-Customer Demo</span>
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CreditCard}
          label="Total Revenue"
          value={`₱${(stats?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          badge="Live"
          accent="text-emerald-600 dark:text-emerald-400"
          bgAccent="bg-emerald-500/10"
        />
        <StatCard
          icon={Ticket}
          label="Confirmed Bookings"
          value={stats?.confirmed ?? "—"}
          badge={`${stats?.bookingsToday ?? 0} today`}
          accent="text-brand-600 dark:text-brand-400"
          bgAccent="bg-brand-500/10"
        />
        <StatCard
          icon={Calendar}
          label="Active Schedules"
          value={stats?.schedules ?? "—"}
          accent="text-purple-600 dark:text-purple-400"
          bgAccent="bg-purple-500/10"
        />
        <StatCard
          icon={Users}
          label="Registered Users"
          value={stats?.users ?? "—"}
          accent="text-blue-600 dark:text-blue-400"
          bgAccent="bg-blue-500/10"
        />
      </div>

      <div className="card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Sequential Processing Engine</h2>
              <p className="text-xs text-slate-500">Live hardware execution pipeline enforcing single-transaction reservations</p>
            </div>
          </div>
          <Link
            to="/admin/processing-logs"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Audit Logs</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 1 · Inbound Queue</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                {pending} Waiting
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{pending}</p>
              <p className="text-xs text-slate-500">Oldest request claimed first via FIFO request order</p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between relative overflow-hidden">
            {currentlyProcessing && (
              <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-brand-500 animate-pulse" />
            )}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 2 · Processing Slot</span>
              {currentlyProcessing ? (
                <StatusBadge status="processing" />
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Slot Idle
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {currentlyProcessing ? `#${currentlyProcessing.request_number}` : "None Active"}
              </p>
              <p className="text-xs text-slate-500">
                {currentlyProcessing
                  ? `Checking seat ${currentlyProcessing.seat_id.slice(0, 8)}…`
                  : "Ready for next queued request"}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Step 3 · Outcomes</span>
              <span className="text-xs text-slate-400 font-mono">{queue?.length ?? 0} total</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{completed} Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{failed} Rejected</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 text-xs border border-blue-100 dark:border-blue-900/40">
          <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Database guarantee: A partial unique index (<code>uq_single_processing_slot</code>) strictly forbids multiple rows from having status="processing" concurrently.
          </span>
        </div>
      </div>

      <div className="card p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-500" />
            <h2 className="font-semibold text-base">Recent Bookings</h2>
          </div>
          <Link to="/admin/bookings" className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto -mx-6">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-6">Reference</th>
                <th className="py-3 px-4">Passenger</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Seat</th>
                <th className="py-3 px-4">Fare</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-6">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentBookings?.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-6 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {b.booking_reference}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium">
                    {b.user?.email ?? "Customer"}
                  </td>
                  <td className="py-3 px-4 text-xs">
                    {b.schedule ? `${b.schedule.origin} → ${b.schedule.destination}` : "—"}
                  </td>
                  <td className="py-3 px-4 text-xs font-bold font-mono">
                    {b.seat?.seat_number ?? "—"}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium">
                    ₱{Number(b.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={b.booking_status} />
                  </td>
                  <td className="py-3 px-6 text-xs text-slate-400">
                    {new Date(b.created_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
              {recentBookings?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
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
  accent,
  bgAccent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  badge?: string;
  accent: string;
  bgAccent: string;
}) {
  return (
    <div className="card p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`p-2 rounded-lg ${bgAccent} ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {badge && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
