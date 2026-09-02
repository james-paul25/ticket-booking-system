export type UserRole = "customer" | "admin";
export type ScheduleStatus = "scheduled" | "boarding" | "departed" | "completed" | "cancelled";
export type SeatStatus = "available" | "reserved" | "booked" | "blocked";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "failed" | "completed";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type QueueStatus = "waiting" | "processing" | "completed" | "failed" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}
