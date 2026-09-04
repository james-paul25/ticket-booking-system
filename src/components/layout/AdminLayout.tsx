import { NavLink, Outlet, useLocation } from "react-router-dom";

const links = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/schedules", label: "Schedules" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/payments", label: "Payments" },
  { to: "/admin/queue", label: "Booking Queue" },
  { to: "/admin/processing-logs", label: "Processing Logs" },
  { to: "/admin/sequential-demo", label: "Sequential Demo" },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-6">
      <aside className="card p-3 h-fit md:sticky md:top-20">
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div key={location.pathname} className="animate-page-fade w-full">
        <Outlet />
      </div>
    </div>
  );
}
