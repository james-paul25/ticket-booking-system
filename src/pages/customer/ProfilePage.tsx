import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { User, Phone, Mail, Shield, Check, LogOut, LayoutDashboard, Ticket } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/services/supabase";
import { bookingService } from "@/services/bookingService";

export function ProfilePage() {
  const { profile, isAdmin, refreshProfile, signOut } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: bookings } = useQuery({
    queryKey: ["profile-bookings-count"],
    queryFn: bookingService.listMine,
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (!profile) return null;

  const initial = profile.full_name?.charAt(0).toUpperCase() || "U";
  const confirmedCount = bookings?.filter((b) => b.booking_status === "confirmed").length ?? 0;

  return (
    <div className="max-w-md mx-auto space-y-6 animate-fade-in">
      <div className="card p-6 sm:p-7 space-y-6 shadow-md border-slate-200/90 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-700 to-brand-500 text-white flex items-center justify-center font-bold text-2xl shadow-glow">
            {initial}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{profile.full_name}</h1>
            <p className="text-xs text-slate-500 truncate max-w-[200px]">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 text-[10px] uppercase font-bold tracking-wider">
                {profile.role}
              </span>
              {isAdmin && (
                <span className="badge bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] uppercase font-bold tracking-wider">
                  Admin Access
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Ticket size={14} /> Active Passes
            </div>
            <span className="text-xl font-extrabold text-brand-600 dark:text-brand-400">
              {confirmedCount}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
              <Shield size={14} /> Total Bookings
            </div>
            <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
              {bookings?.length ?? 0}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <User size={13} /> Full Name
            </label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <Mail size={13} /> Email Address
            </label>
            <input className="input opacity-70 cursor-not-allowed" value={profile.email} disabled />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
              <Phone size={13} /> Phone Number
            </label>
            <input
              className="input"
              placeholder="e.g. 09551234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full !py-2.5 font-semibold text-xs"
            disabled={saving}
          >
            {saving ? "Saving…" : saved ? "Changes Saved!" : "Update Profile"}
            {saved && <Check size={14} className="text-white" />}
          </button>
        </form>

        {isAdmin && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/admin"
              className="btn-secondary w-full text-xs !py-2.5 font-semibold text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            >
              <LayoutDashboard size={15} /> Switch to Admin Dashboard
            </Link>
          </div>
        )}

        <button
          onClick={() => signOut()}
          className="btn-secondary w-full text-xs !py-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  );
}
