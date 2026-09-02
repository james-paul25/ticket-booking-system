import { useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { supabase } from "@/services/supabase";

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setSaved(false);
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", profile.id);
    await refreshProfile();
    setSaving(false);
    setSaved(true);
  }

  if (!profile) return null;

  return (
    <div className="max-w-md mx-auto card p-8 space-y-4">
      <h1 className="text-xl font-semibold">My Profile</h1>
      <div>
        <label className="block text-sm font-medium mb-1">Full name</label>
        <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input className="input" value={profile.email} disabled />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Role</label>
        <input className="input" value={profile.role} disabled />
      </div>
      <button className="btn-primary w-full" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </button>
      {saved && <p className="text-xs text-emerald-600 text-center">Saved!</p>}
    </div>
  );
}
