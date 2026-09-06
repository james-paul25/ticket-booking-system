import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex h-8 w-14 sm:h-8.5 sm:w-15 items-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 shrink-0 ${className}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 sm:left-1 sm:top-1 flex h-6.5 w-6.5 items-center justify-center rounded-full bg-white dark:bg-slate-950 shadow transition-transform ${
          isDark ? "translate-x-6 sm:translate-x-6.5" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={13} className="text-brand-400" /> : <Sun size={13} className="text-amber-500" />}
      </span>
    </button>
  );
}
