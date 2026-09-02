import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/services/supabase";
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
  const { data: queue } = useQuery({ queryKey: ["admin-queue-snapshot"], queryFn: () => bookingQueueService.listAll(), refetchInterval: 2000 });

  const currentlyProcessing = queue?.find((q) => q.status === "processing");
  const pending = queue?.filter((q) => q.status === "waiting").length ?? 0;
  const completed = queue?.filter((q) => q.status === "completed").length ?? 0;
  const failed = queue?.filter((q) => q.status === "failed").length ?? 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
        <Link to="/admin/sequential-demo" className="btn-primary">
          Open Sequential Demo
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total Users" value={stats?.users ?? "—"} />
        <Card label="Total Schedules" value={stats?.schedules ?? "—"} />
        <Card label="Today's Bookings" value={stats?.bookingsToday ?? "—"} />
        <Card label="Confirmed Bookings" value={stats?.confirmed ?? "—"} />
        <Card label="Cancelled Bookings" value={stats?.cancelled ?? "—"} />
        <Card label="Total Revenue" value={`₱${(stats?.totalRevenue ?? 0).toFixed(2)}`} />
        <Card label="Pending Queue Requests" value={pending} />
        <Card label="Processing Requests" value={currentlyProcessing ? 1 : 0} />
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Sequential Processing Monitor</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-2 text-sm">
            <Row label="Current Request">
              {currentlyProcessing ? `#${currentlyProcessing.request_number}` : "None active"}
            </Row>
            <Row label="Processing Status">
              {currentlyProcessing ? <StatusBadge status="processing" /> : <StatusBadge status="waiting" />}
            </Row>
            <Row label="Queue Position (next up)">{pending > 0 ? `${pending} waiting` : "Queue empty"}</Row>
          </div>
          <div className="space-y-2 text-sm">
            <Row label="Completed Requests">{completed}</Row>
            <Row label="Failed Requests">{failed}</Row>
            <Row label="Total Requests Tracked">{queue?.length ?? 0}</Row>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-4">
          Only one request can be "processing" at any moment — enforced by a database-level unique index, not just this UI.
        </p>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}
