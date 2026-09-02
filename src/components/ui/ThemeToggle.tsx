import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative inline-flex h-9 w-16 items-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      <span
        className={`absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-950 shadow transition-transform ${
          isDark ? "translate-x-7" : "translate-x-0"
        }`}
      >
        {isDark ? <Moon size={14} className="text-brand-400" /> : <Sun size={14} className="text-amber-500" />}
      </span>
    </button>
  );
}
