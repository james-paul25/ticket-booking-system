import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, Ticket, History, User } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

export function CustomerBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  if (location.pathname.startsWith("/admin")) {
    return null;
  }

  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/schedules", label: "Trips", icon: Compass, end: false },
    { 
      to: user ? "/bookings" : "/login", 
      label: "Tickets", 
      icon: Ticket, 
      end: false,
      activeWhen: location.pathname.startsWith("/booking") || location.pathname.startsWith("/bookings")
    },
    { 
      to: user ? "/bookings" : "/login", 
      label: "Activity", 
      icon: History, 
      end: false,
      activeWhen: location.pathname === "/bookings"
    },
    { 
      to: user ? "/profile" : "/login", 
      label: "Profile", 
      icon: User, 
      end: false 
    },
  ];

  return (
    <nav aria-label="Customer navigation" className="fixed bottom-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none md:hidden">
      <div className="pointer-events-auto w-full max-w-md glass-panel rounded-2xl p-1.5 shadow-floating dark:shadow-floating-dark border border-white/40 dark:border-slate-800/80">
        <div className="grid grid-cols-5 gap-1">
          {items.map((item, idx) => {
            const Icon = item.icon;
            const isMatch = item.activeWhen !== undefined 
              ? item.activeWhen 
              : item.end 
                ? location.pathname === item.to 
                : location.pathname.startsWith(item.to);

            return (
              <NavLink
                key={`${item.label}-${idx}`}
                to={item.to}
                className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-medium transition-all duration-200 select-none ${
                  isMatch
                    ? "text-brand-600 dark:text-brand-400 font-semibold scale-105"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {isMatch && (
                  <span className="absolute inset-0 rounded-xl bg-brand-50/90 dark:bg-brand-950/60 -z-10 animate-fade-in" />
                )}
                <Icon size={20} strokeWidth={isMatch ? 2.3 : 1.8} className="mb-0.5" />
                <span className="leading-none">{item.label}</span>
                {isMatch && (
                  <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-brand-600 dark:bg-brand-400" />
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
