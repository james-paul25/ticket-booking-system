import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  ArrowRight,
  UserPlus,
  LogIn,
  X,
  Calendar,
  Ship,
  CheckCircle2,
} from "lucide-react";

interface AuthTrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  originPortName?: string;
  destPortName?: string;
  travelDate?: string;
  vesselName?: string;
  departureTime?: string;
  fare?: string;
  targetUrl: string;
}

export function AuthTrapModal({
  isOpen,
  onClose,
  originPortName,
  destPortName,
  travelDate,
  vesselName,
  departureTime,
  fare,
  targetUrl,
}: AuthTrapModalProps) {
  const navigate = useNavigate();
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setIsMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  const handleSignIn = () => {
    navigate("/login", {
      state: {
        from: { pathname: targetUrl },
        returnTo: targetUrl,
        message: "Please sign in to proceed with your booking payment.",
      },
    });
  };

  const handleRegister = () => {
    navigate("/register", {
      state: {
        from: { pathname: targetUrl },
        returnTo: targetUrl,
      },
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-trap-title"
      className="fixed inset-0 z-[10001] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300 ease-out cursor-pointer ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] my-auto flex flex-col ${
          isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 translate-y-3"
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/40 dark:border-amber-800/40 flex items-center justify-center shrink-0">
              <Lock size={16} />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Authentication Required
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="space-y-1.5">
            <h3 id="auth-trap-title" className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Sign In to Proceed to Payment
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Seat allocations and ticket checkout require a verified passenger account. Sign in to confirm your booking and proceed to payment.
            </p>
          </div>

          {/* Selected Itinerary Summary Card (Trap Retention) */}
          {(originPortName || destPortName) && (
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Your Selected Itinerary
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/60 flex items-center gap-1">
                  <CheckCircle2 size={10} />
                  Saved
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center justify-between text-xs">
                <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[42%]">
                  {originPortName || "Origin"}
                </div>
                <ArrowRight size={13} className="text-blue-500 shrink-0 mx-2" />
                <div className="font-extrabold text-slate-900 dark:text-slate-100 truncate max-w-[42%] text-right">
                  {destPortName || "Destination"}
                </div>
              </div>

              {/* Details line */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-blue-500" />
                  <span>{travelDate || "Selected Date"}</span>
                </div>
                {vesselName && (
                  <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                    <Ship size={12} className="text-emerald-500" />
                    <span>{departureTime ? `${departureTime} · ` : ""}{vesselName}</span>
                  </div>
                )}
                {fare && (
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {fare}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-black shadow-md shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn size={15} />
              <span>Sign In to Continue to Payment</span>
            </button>

            <button
              type="button"
              onClick={handleRegister}
              className="w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={15} />
              <span>Create New Passenger Account</span>
            </button>
          </div>
        </div>

        {/* Dismiss Footer */}
        <div className="p-3 bg-slate-50/80 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Stay on Map & Route Planner
          </button>
        </div>
      </div>
    </div>
  );
}
