import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin, loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <CenteredSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    </div>
  );
}
