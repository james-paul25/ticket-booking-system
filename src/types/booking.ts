import type { BookingStatus } from "./database";
import type { Schedule } from "./schedule";
import type { Seat } from "./seat";

export interface Booking {
  id: string;
  booking_reference: string;
  user_id: string;
  schedule_id: string;
  seat_id: string;
  booking_status: BookingStatus;
  total_amount: number;
  booked_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // Optional joined data for detail views
  schedule?: Schedule;
  seat?: Seat;
  user?: { id: string; email: string; full_name?: string | null };
}

export interface BookingCancellation {
  id: string;
  booking_id: string;
  cancelled_by: string;
  reason: string | null;
  cancelled_at: string;
  refund_amount: number | null;
  created_at: string;
}
