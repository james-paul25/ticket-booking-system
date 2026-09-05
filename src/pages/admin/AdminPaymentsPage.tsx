import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, CreditCard, RefreshCw, Filter } from "lucide-react";
import { supabase } from "@/services/supabase";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Payment } from "@/types/payment";
import type { PaymentStatus } from "@/types/database";

async function loadPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("*, user:profiles(email, full_name), booking:bookings(booking_reference)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as Payment[];
}

export function AdminPaymentsPage() {
  const { data: payments, isLoading, refetch } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: loadPayments,
  });

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | "all">("all");

  const counts = useMemo(() => {
    const map = { all: payments?.length ?? 0, paid: 0, pending: 0, refunded: 0, failed: 0 };
    payments?.forEach((p) => {
      if (p.payment_status in map) {
        map[p.payment_status as keyof typeof map]++;
      }
    });
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    return (payments ?? []).filter((p) => {
      if (selectedStatus !== "all" && p.payment_status !== selectedStatus) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const ref = p.transaction_reference.toLowerCase();
      const bRef = p.booking?.booking_reference?.toLowerCase() ?? "";
      const email = p.user?.email?.toLowerCase() ?? "";
      const method = p.payment_method.toLowerCase();
      return ref.includes(q) || bRef.includes(q) || email.includes(q) || method.includes(q);
    });
  }, [payments, search, selectedStatus]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments & Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit simulated payment transactions, card records, and settlement status.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="card p-4 space-y-4 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search transaction ref, booking ref, passenger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {(["all", "paid", "pending", "refunded", "failed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {st} <span className="text-[11px] opacity-80 font-mono">({counts[st]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 -mb-4 border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transaction Ref</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Passenger</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Paid At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {p.transaction_reference}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                    {p.booking?.booking_reference ?? "—"}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200">{p.user?.email ?? "—"}</p>
                    {p.user?.full_name && <p className="text-[11px] text-slate-400">{p.user.full_name}</p>}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-bold">
                    ₱{Number(p.amount).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-xs capitalize text-slate-600 dark:text-slate-400">
                    {p.payment_method.replace(/_/g, " ")}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={p.payment_status} />
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                    {p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CreditCard className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No payment records found.</p>
                      {(search || selectedStatus !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setSelectedStatus("all");
                          }}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-1 py-2 text-xs text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
          <span>Showing {filtered.length} of {payments?.length ?? 0} transactions</span>
          <span>Settlement Audit Log</span>
        </div>
      </div>
    </div>
  );
}
