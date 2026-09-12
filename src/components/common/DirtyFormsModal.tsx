import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface DirtyFormsModalProps {
  isOpen: boolean;
  seatLabel?: string | null;
  onKeepSeat: () => void;
  onDiscardAndLeave: () => void;
}

export function DirtyFormsModal({
  isOpen,
  seatLabel,
  onKeepSeat,
  onDiscardAndLeave,
}: DirtyFormsModalProps) {
  // Support smooth unmount animation
  const [rendered, setRendered] = useState(isOpen);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      const timer = setTimeout(() => setActive(true), 25);
      return () => clearTimeout(timer);
    } else {
      setActive(false);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle ESC key to dismiss modal (keep seat)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onKeepSeat();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, onKeepSeat]);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300 ease-out select-none ${
        active
          ? "opacity-100 pointer-events-auto bg-black/60 backdrop-blur-sm"
          : "opacity-0 pointer-events-none bg-black/0 backdrop-blur-none"
      }`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="dirty-modal-title"
      aria-describedby="dirty-modal-desc"
      onClick={onKeepSeat}
    >
      <div
        className={`w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-2xl border-t sm:border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto overscroll-contain transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] transform ${
          active ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 sm:translate-y-4 scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 shrink-0 sm:hidden" aria-hidden="true" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle size={17} strokeWidth={2.2} />
            </div>
            <h3
              id="dirty-modal-title"
              className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight"
            >
              Leave seat selection?
            </h3>
          </div>
          <button
            type="button"
            onClick={onKeepSeat}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
            aria-label="Close dialog and keep seat"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {seatLabel ? (
            <p id="dirty-modal-desc">
              You have selected <span className="font-bold text-slate-900 dark:text-slate-100">Seat {seatLabel}</span>. Leaving now will release this seat and cancel your reservation.
            </p>
          ) : (
            <p id="dirty-modal-desc">
              You have an active seat reservation in progress. If you leave now, your seat will be released.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onDiscardAndLeave}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent transition-colors cursor-pointer"
          >
            Discard & Leave
          </button>

          <button
            type="button"
            autoFocus
            onClick={onKeepSeat}
            className="btn-primary !py-2.5 !px-5 text-xs font-bold cursor-pointer"
          >
            Keep My Seat
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
