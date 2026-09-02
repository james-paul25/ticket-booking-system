import { Link, NavLink, Outlet } from "react-router-dom";
import { Ticket, Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  }`;

export function AppLayout() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg">
            <Ticket className="text-brand-600" />
            SeqBook
            <span className="hidden sm:inline text-xs font-normal text-slate-400 border-l pl-2 ml-1 border-slate-300 dark:border-slate-700">
              Sequential Processing
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/schedules" className={navLinkClass}>
              Schedules
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navLinkClass}>
                My Bookings
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="inline-flex items-center gap-1">
                  <LayoutDashboard size={14} /> Admin
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/profile" className="text-sm text-slate-600 dark:text-slate-300 hover:underline">
                  {profile?.full_name ?? user.email}
                </Link>
                <button onClick={() => signOut()} className="btn-secondary !px-3 !py-1.5">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-secondary !px-3 !py-1.5">
                  Login
                </Link>
                <Link to="/register" className="btn-primary !px-3 !py-1.5">
                  Register
                </Link>
              </div>
            )}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex flex-col gap-1">
            <NavLink to="/schedules" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Schedules
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                My Bookings
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Admin
              </NavLink>
            )}
            {user ? (
              <button className="btn-secondary mt-2" onClick={() => signOut()}>
                <LogOut size={14} /> Logout
              </button>
            ) : (
              <div className="flex gap-2 mt-2">
                <Link to="/login" className="btn-secondary flex-1" onClick={() => setMenuOpen(false)}>
                  Login
                </Link>
                <Link to="/register" className="btn-primary flex-1" onClick={() => setMenuOpen(false)}>
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        SeqBook — Online Ticket Booking System · Group 1: Sequential Processing
      </footer>
    </div>
  );
}
