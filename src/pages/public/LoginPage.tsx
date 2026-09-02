import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const from = (location.state as { from?: Location })?.from?.pathname ?? "/schedules";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await signIn(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-2xl font-semibold mb-1">Welcome back</h1>
      <p className="text-sm text-slate-500 mb-6">Log in to book seats and manage your tickets.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="input" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input className="input" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        {serverError && <p className="text-sm text-red-500">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-slate-500">
        No account?{" "}
        <Link to="/register" className="text-brand-600 hover:underline">
          Register
        </Link>
      </p>
    </div>
  );
}
