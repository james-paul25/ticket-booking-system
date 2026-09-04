import { useState, useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Ship, LogOut, LayoutDashboard, UserCircle2,
  Menu, X, Compass, Ticket, Home,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 ${
    isActive
      ? "bg-blue-50 text-blue-600 font-bold"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;

export function AppLayout() {
  const location = useLocation();
  const { user, profile, isAdmin, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col bg-white text-slate-900 w-full"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      <header
        className={`sticky top-0 z-40 w-full transition-all duration-200 ${
          scrolled
            ? "border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm"
            : "border-b border-slate-100 bg-white"
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-2.5">
            <Link
              to="/"
              className="flex items-center gap-3 select-none group"
              aria-label="SeqBook home"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/25">
                <Ship size={19} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  SeqBook
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  Bohol Sea Transit
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              <span className="inline-flex items-center gap-1.5"><Home size={14} />Home</span>
            </NavLink>
            <NavLink to="/schedules" className={navLinkClass}>
              <span className="inline-flex items-center gap-1.5"><Compass size={14} />Trips</span>
            </NavLink>
            {user && (
              <NavLink to="/bookings" className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5"><Ticket size={14} />My Tickets</span>
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" className={navLinkClass}>
                <span className="inline-flex items-center gap-1.5 text-amber-600 font-semibold">
                  <LayoutDashboard size={14} />Admin
                </span>
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 py-1.5 px-3 rounded-xl hover:bg-slate-50 border border-slate-200 text-xs font-semibold transition-colors duration-150"
                >
                  <div className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {profile?.full_name?.charAt(0).toUpperCase() ?? <UserCircle2 size={12} />}
                  </div>
                  <span className="hidden sm:inline text-slate-700">
                    {profile?.full_name?.split(" ")[0] ?? "Account"}
                  </span>
                </Link>
                <button
                  onClick={() => signOut()}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all duration-150"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="py-1.5 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="py-1.5 px-3.5 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-600/25 transition-all"
                >
                  Create account
                </Link>
              </div>
            )}

            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors ml-0.5"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-3 space-y-1 animate-slide-up">
            <Link
              to="/"
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Home size={16} className="text-brand-600 dark:text-cyan-400" /> Home
            </Link>
            <Link
              to="/schedules"
              className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Compass size={16} className="text-brand-600 dark:text-cyan-400" /> Available Trips
            </Link>
            {user && (
              <Link
                to="/bookings"
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Ticket size={16} className="text-brand-600 dark:text-cyan-400" /> My Bookings & Passes
              </Link>
            )}
            {user && (
              <Link
                to="/profile"
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <UserCircle2 size={16} className="text-brand-600 dark:text-cyan-400" /> My Profile
              </Link>
            )}
            {isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                <LayoutDashboard size={16} /> Admin Console
              </Link>
            )}
            {!user && (
              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Link to="/login" className="btn-secondary flex-1 !py-2 !text-xs font-semibold">
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary flex-1 !py-2 !text-xs font-semibold">
                  Register
                </Link>
              </div>
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
