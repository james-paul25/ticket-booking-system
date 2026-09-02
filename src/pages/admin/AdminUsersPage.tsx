import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import type { Profile } from "@/types/database";

async function loadUsers(): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as Profile[];
}

export function AdminUsersPage() {
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: loadUsers });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-left text-xs text-slate-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Role</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="p-3">{u.full_name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.phone ?? "—"}</td>
                <td className="p-3 capitalize">{u.role}</td>
                <td className="p-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
