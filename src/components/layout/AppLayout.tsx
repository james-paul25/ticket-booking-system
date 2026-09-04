import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Anchor, LogOut, LayoutDashboard, UserCircle2,
  Menu, X, Compass, Ticket, Home, Moon, Sun,
  
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useTheme } from "@/app/ThemeContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-cyan-950/70 dark:text-cyan-300 font-bold"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80"
  }`;

export function AppLayout() {
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 w-full">
        <div className="mx-auto max-w-6xl px-3 sm:px-4 flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="relative w-10 h-10 rounded-2xl flex items-center justify-center bg-brand-600 dark:bg-slate-900 text-white dark:text-cyan-400 border border-brand-500 dark:border-slate-700 active:scale-90 transition-transform"
            >
              <Anchor size={20} />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-amber-500 dark:text-cyan-300">
                {theme === "dark" ? <Moon size={9} strokeWidth={2.5} /> : <Sun size={9} strokeWidth={2.5} />}
              </div>
            </button>

            <Link to="/" className="flex flex-col select-none">
              <span className="font-extrabold text-base tracking-tight leading-tight">
                SeqBook
              </span>
              <span className="text-[10px] font-bold text-brand-600 dark:text-cyan-400/80 uppercase tracking-widest leading-none">
                SeaTransit
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <NavLink to="/schedules" className={navLinkClass}>Trips</NavLink>
            {user && <NavLink to="/bookings" className={navLinkClass}>My Tickets</NavLink>}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <LayoutDashboard size={14} /> Admin
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="flex items-center gap-1.5 py-1 px-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
                >
                  <UserCircle2 size={16} className="text-brand-600 dark:text-cyan-400" />
                  <span className="hidden sm:inline">
                    {profile?.full_name?.split(" ")[0] ?? "Account"}
                  </span>
                </Link>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/login" className="btn-secondary !py-1.5 !px-3 !text-xs font-semibold">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary !py-1.5 !px-3 !text-xs font-semibold">
                  Register
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 ml-1"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-1">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
              <Home size={16} className="text-brand-600 dark:text-cyan-400" /> Home
            </Link>
            <Link to="/schedules" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
              <Compass size={16} className="text-brand-600 dark:text-cyan-400" /> Available Trips
            </Link>
            {user && (
              <Link to="/bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
                <Ticket size={16} className="text-brand-600 dark:text-cyan-400" /> My Bookings & Passes
              </Link>
            )}
            {user && (
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
                <UserCircle2 size={16} className="text-brand-600 dark:text-cyan-400" /> My Profile
              </Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400">
                <LayoutDashboard size={16} /> Admin Console
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-3 sm:px-4 py-5 sm:py-7">
        <div key={location.pathname} className="animate-page-fade w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
