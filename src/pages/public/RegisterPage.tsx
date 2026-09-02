import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(7, "Enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await signUp({ fullName: values.fullName, email: values.email, password: values.password, phone: values.phone });
      setDone(true);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Registration failed");
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto card p-8 text-center">
        <h1 className="text-xl font-semibold mb-2">Account created 🎉</h1>
        <p className="text-sm text-slate-500">Redirecting you to login…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto card p-8">
      <h1 className="text-2xl font-semibold mb-1">Create your account</h1>
      <p className="text-sm text-slate-500 mb-6">Register to search schedules and book seats.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full name</label>
          <input className="input" {...register("fullName")} />
          {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input className="input" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Phone number</label>
          <input className="input" {...register("phone")} />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input className="input" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        {serverError && <p className="text-sm text-red-500">{serverError}</p>}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Register"}
        </button>
      </form>

      <p className="text-sm text-center mt-6 text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
