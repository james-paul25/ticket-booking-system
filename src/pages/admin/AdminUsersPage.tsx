import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, RefreshCw, Filter, ShieldCheck, User } from "lucide-react";
import { supabase } from "@/services/supabase";
import type { Profile } from "@/types/database";

async function loadUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Profile[];
}

export function AdminUsersPage() {
  const { data: users, isLoading, refetch } = useQuery({ queryKey: ["admin-users"], queryFn: loadUsers });

  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<"all" | "admin" | "customer">("all");

  const counts = useMemo(() => {
    const map = { all: users?.length ?? 0, admin: 0, customer: 0 };
    users?.forEach((u) => {
      if (u.role === "admin") map.admin++;
      if (u.role === "customer") map.customer++;
    });
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return (users ?? []).filter((u) => {
      if (selectedRole !== "all" && u.role !== selectedRole) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const name = u.full_name?.toLowerCase() ?? "";
      const email = u.email.toLowerCase();
      const phone = u.phone?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [users, search, selectedRole]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Registered customer accounts, roles, and administrative access.
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
              placeholder="Search user name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs w-full"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            {(["all", "customer", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition-all ${
                  selectedRole === r
                    ? "bg-brand-600 text-white font-semibold shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {r} <span className="text-[11px] opacity-80 font-mono">({counts[r]})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto -mx-4 -mb-4 border-t border-slate-100 dark:border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Registered Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((u) => {
                const isAdmin = u.role === "admin";
                const initials = (u.full_name || u.email).slice(0, 2).toUpperCase();

                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isAdmin
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}>
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                            {u.full_name || "Unnamed User"}
                          </p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {u.phone || "—"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        isAdmin
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}>
                        {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="h-8 w-8 text-slate-400" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No users match your filters.</p>
                      {(search || selectedRole !== "all") && (
                        <button
                          onClick={() => {
                            setSearch("");
                            setSelectedRole("all");
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
          <span>Showing {filtered.length} of {users?.length ?? 0} profiles</span>
          <span>Supabase Auth Profiles</span>
        </div>
      </div>
    </div>
  );
}
