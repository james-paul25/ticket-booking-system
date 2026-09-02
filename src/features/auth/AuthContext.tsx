import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import type { Profile } from "@/types/database";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { fullName: string; email: string; password: string; phone?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) loadProfile(newSession.user.id);
      else setProfile(null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    profile,
    loading,
    isAdmin: profile?.role === "admin",
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
    },
    async signUp({ fullName, email, password, phone }) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, phone: phone ?? null } },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async refreshProfile() {
      if (session?.user) await loadProfile(session.user.id);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
