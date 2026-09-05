import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Calendar,
  Ticket,
  Users,
  CreditCard,
  ListOrdered,
  Activity,
  PlayCircle,
  Cpu,
  Ship,
} from "lucide-react";
import { bookingQueueService } from "@/features/queue/bookingQueueService";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  highlight?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/schedules", label: "Schedules", icon: Calendar },
      { to: "/admin/bookings", label: "Bookings", icon: Ticket },
      { to: "/admin/payments", label: "Payments", icon: CreditCard },
      { to: "/admin/users", label: "Users", icon: Users },
      { to: "/admin/fleet", label: "Fleet Tracking", icon: Ship },
    ],
  },
  {
    title: "Sequential Engine",
    items: [
      { to: "/admin/queue", label: "Booking Queue", icon: ListOrdered },
      { to: "/admin/processing-logs", label: "Processing Logs", icon: Activity },
      { to: "/admin/sequential-demo", label: "Sequential Demo", icon: PlayCircle, highlight: true },
    ],
  },
];

export function AdminLayout() {
  const location = useLocation();

  const { data: queue } = useQuery({
    queryKey: ["admin-nav-queue"],
    queryFn: () => bookingQueueService.listAll(),
    refetchInterval: 3000,
  });

  const waitingCount = queue?.filter((q) => q.status === "waiting").length ?? 0;
  const isProcessing = queue?.some((q) => q.status === "processing");

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6 items-start">
      <aside className="card p-3 md:sticky md:top-20 space-y-4 shadow-sm border border-slate-200/80 dark:border-slate-800">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          <Cpu className="h-3.5 w-3.5 text-brand-500" />
          <span>Admin Portal</span>
        </div>

        <nav className="flex md:flex-col gap-4 overflow-x-auto pb-1 md:pb-0">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1 min-w-max md:min-w-0">
              <div className="hidden md:block px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                {section.title}
              </div>
              <div className="flex md:flex-col gap-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isQueueItem = item.to === "/admin/queue";

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          isActive
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold shadow-xs"
                            : item.highlight
                            ? "text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">{item.label}</span>
                      </div>

                      {isQueueItem && (
                        <div className="flex items-center gap-1">
                          {isProcessing && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                            </span>
                          )}
                          {waitingCount > 0 && (
                            <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                              {waitingCount}
                            </span>
                          )}
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div key={location.pathname} className="animate-page-fade w-full min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
