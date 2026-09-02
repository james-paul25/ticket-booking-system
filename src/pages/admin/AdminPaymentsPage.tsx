import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Payment } from "@/types/payment";

async function loadPayments(): Promise<Payment[]> {
  const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Payment[];
}

export function AdminPaymentsPage() {
  const { data: payments } = useQuery({ queryKey: ["admin-payments"], queryFn: loadPayments });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Transaction Ref</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Method</th>
              <th className="p-3">Status</th>
              <th className="p-3">Paid At</th>
            </tr>
          </thead>
          <tbody>
            {payments?.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3 font-mono text-xs">{p.transaction_reference}</td>
                <td className="p-3">₱{Number(p.amount).toFixed(2)}</td>
                <td className="p-3">{p.payment_method}</td>
                <td className="p-3">
                  <StatusBadge status={p.payment_status} />
                </td>
                <td className="p-3 text-xs text-slate-500">{p.paid_at ? new Date(p.paid_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
