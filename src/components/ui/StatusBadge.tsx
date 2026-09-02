const STYLES: Record<string, string> = {
  // queue
  waiting: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 animate-pulse",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  cancelled: "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  // booking
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  // payment
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  refunded: "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  // seat
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  booked: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  reserved: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  blocked: "bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STYLES[status] ?? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return <span className={`badge ${style}`}>{status.toUpperCase()}</span>;
}
