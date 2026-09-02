import { Link } from "react-router-dom";
import { ArrowRight, ListOrdered, ShieldCheck, Timer } from "lucide-react";

export function LandingPage() {
  return (
    <div className="space-y-16">
      <section className="text-center py-12">
        <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 mb-4">
          Group 1 · Sequential Processing
        </span>
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
          Book tickets, processed <span className="text-brand-600">one request at a time.</span>
        </h1>
        <p className="max-w-2xl mx-auto text-slate-600 dark:text-slate-400 mb-8">
          SeqBook is an online ticket booking system where every booking request enters a queue and
          is processed strictly in order — no duplicate bookings, no race conditions, every step logged.
        </p>
        <div className="flex justify-center gap-3">
          <Link to="/schedules" className="btn-primary">
            Browse Schedules <ArrowRight size={16} />
          </Link>
          <Link to="/register" className="btn-secondary">
            Create an Account
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-5">
        <FeatureCard
          icon={<ListOrdered className="text-brand-600" />}
          title="Sequential Queue"
          text="Every booking request gets a sequence number and is processed strictly in that order — one at a time, never in parallel."
        />
        <FeatureCard
          icon={<ShieldCheck className="text-brand-600" />}
          title="Zero Duplicate Bookings"
          text="Seat reservation, booking, and payment happen inside a single atomic database transaction, backed by database-level uniqueness constraints."
        />
        <FeatureCard
          icon={<Timer className="text-brand-600" />}
          title="Transparent Processing Logs"
          text="Every step — queued, processing, seat check, reserved, confirmed — is timestamped and visible, proving the order of operations."
        />
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="card p-6">
      <div className="mb-3">{icon}</div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-400">{text}</p>
    </div>
  );
}
