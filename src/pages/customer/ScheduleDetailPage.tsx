import { useParams, useSearchParams, Navigate } from "react-router-dom";

/**
 * Legacy schedule detail route redirector.
 * Automatically forwards passengers to the modern 3D isometric cabin stage seating arrangement.
 */
export function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const search = searchParams.toString();
  return <Navigate to={`/schedules/${id}/seats${search ? `?${search}` : ""}`} replace />;
}

export default ScheduleDetailPage;