import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Ship,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";

const schema = z.object({
  fullName: z.string().min(2, "Enter your full name (at least 2 characters)"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(7, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const playReveal = !(location.state as { noAnim?: boolean } | null)?.noAnim;

  useEffect(() => {
    if ((location.state as { noAnim?: boolean } | null)?.noAnim) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    setServerError(null);
    try {
      await signUp({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please check your details and try again."
      );
    }
  }

  return (
    <div
      className="h-screen w-full flex overflow-hidden selection:bg-blue-600 selection:text-white"
      style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}
    >
      {/* ─── Left Panel: Form ─── */}
      <div className="relative z-10 w-full lg:w-[44%] flex-shrink-0 bg-white flex flex-col justify-between px-8 sm:px-12 lg:px-12 xl:px-16 py-6 sm:py-7 h-full overflow-y-auto">
        {/* Brand */}
        <div className="flex items-center gap-3 animate-fade-drop">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
            <Ship size={19} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none tracking-tight">SeqBook</p>
            <p className="text-[10px] font-semibold text-slate-400 tracking-widest uppercase mt-0.5">
              Bohol Sea Transit
            </p>
          </div>
        </div>

        {/* Form Content */}
        <div className="flex-1 flex flex-col justify-center py-3 max-w-[320px] w-full mx-auto my-auto">
          {done ? (
            <div className="text-center space-y-4 animate-fade-drop">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ letterSpacing: "-0.02em" }}>
                  Account created!
                </h2>
                <p className="text-sm text-slate-500 mt-1.5">
                  Redirecting you to sign in…
                </p>
              </div>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline underline-offset-4"
              >
                Click here if not redirected <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-5 animate-fade-drop delay-75">
                <h1
                  className="text-[1.6rem] font-bold text-slate-900 leading-snug"
                  style={{ letterSpacing: "-0.025em" }}
                >
                  Create an account
                </h1>
                <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                  Book fastcraft tickets across the Bohol Sea.
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 animate-fade-drop delay-150" noValidate>
                {/* Full Name */}
                <div>
                  <label htmlFor="reg-fullName" className="block text-xs font-semibold text-slate-600 mb-1 tracking-wide">
                    Full name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <User size={15} />
                    </div>
                    <input
                      id="reg-fullName"
                      type="text"
                      autoComplete="name"
                      className={`w-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-slate-50 rounded-2xl pl-10 pr-4 py-2.5 border outline-none transition-all ${
                        errors.fullName
                          ? "border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                      placeholder="Juan Dela Cruz"
                      {...register("fullName")}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={11} /> {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-600 mb-1 tracking-wide">
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Mail size={15} />
                    </div>
                    <input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      className={`w-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-slate-50 rounded-2xl pl-10 pr-4 py-2.5 border outline-none transition-all ${
                        errors.email
                          ? "border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                      placeholder="juan@example.com"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={11} /> {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-semibold text-slate-600 mb-1 tracking-wide">
                    Mobile number
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Phone size={15} />
                    </div>
                    <input
                      id="reg-phone"
                      type="tel"
                      autoComplete="tel"
                      className={`w-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-slate-50 rounded-2xl pl-10 pr-4 py-2.5 border outline-none transition-all ${
                        errors.phone
                          ? "border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                      placeholder="+63 912 345 6789"
                      {...register("phone")}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={11} /> {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="reg-password" className="block text-xs font-semibold text-slate-600 mb-1 tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <Lock size={15} />
                    </div>
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`w-full text-sm font-medium text-slate-900 placeholder-slate-400 bg-slate-50 rounded-2xl pl-10 pr-12 py-2.5 border outline-none transition-all ${
                        errors.password
                          ? "border-rose-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-500/10"
                          : "border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                      }`}
                      placeholder="At least 6 characters"
                      {...register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] font-medium text-rose-500 flex items-center gap-1 mt-1">
                      <AlertCircle size={11} /> {errors.password.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{serverError}</span>
                  </div>
                )}

                <button
                  id="register-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating account…</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-5 pt-4 border-t border-slate-100 animate-fade-drop delay-250">
                <p className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    state={{ noAnim: true }}
                    className="font-semibold text-blue-600 hover:text-blue-700 underline-offset-4 hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-slate-400 font-medium animate-fade-drop delay-350">
          © 2026 SeqBook · Bohol Maritime Operations
        </p>
      </div>

      {/* ─── Right Panel: Slashed Polygon Ferry Image ─── */}
      <div className="hidden lg:block lg:w-[56%] relative h-full bg-white">
        <div
          className={`w-full h-full relative overflow-hidden ${playReveal ? "animate-slash-reveal" : "slash-revealed"}`}
        >
          <img
            src="/images/oceanjet.jpg"
            alt="OceanJet Fastcraft Passenger Vessel on the Bohol Sea"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Subtle gradient grounding */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

          {/* Caption */}
          <div className="absolute bottom-0 left-0 right-0 p-10 lg:p-12 pl-12 lg:pl-14 animate-fade-drop delay-350">
            <p
              className="text-white text-2xl font-extrabold leading-tight mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Bohol Sea<br />Fastcraft Passenger Service
            </p>
            <p className="text-white/70 text-sm font-medium">
              Tagbilaran · Tubigon · Jagna · Cebu Pier 1
            </p>

            <div className="flex items-center gap-2 mt-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white/80 text-xs font-semibold tracking-wide">
                OceanJet Fleet · Operating Daily
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
