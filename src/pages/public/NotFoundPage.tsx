import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="text-center py-24">
      <p className="text-6xl font-bold text-brand-600 mb-4">404</p>
      <p className="text-slate-500 mb-6">Page not found.</p>
      <Link to="/" className="btn-primary">
        Back home
      </Link>
    </div>
  );
}
