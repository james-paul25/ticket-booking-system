import type { QueueStatus } from "./database";

export interface BookingQueueRequest {
  id: string;
  request_number: number;
  user_id: string;
  schedule_id: string;
  seat_id: string;
  booking_id: string | null;
  status: QueueStatus;
  queued_at: string;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  result_message: string | null;
  created_at: string;
  updated_at: string;
  // Convenience fields joined in for display (populated client-side)
  customer_name?: string;
  seat_number?: string;
}

export type ProcessingLogAction =
  | "QUEUED"
  | "PROCESSING_STARTED"
  | "SEAT_CHECK"
  | "SEAT_RESERVED"
  | "BOOKING_CREATED"
  | "PAYMENT_RECORDED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_FAILED"
  | "PROCESSING_COMPLETED";

export interface ProcessingLog {
  id: string;
  queue_id: string;
  request_number: number;
  action: ProcessingLogAction | string;
  message: string | null;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  processing_duration_ms: number | null;
  created_at: string;
}

export interface QueueMetrics {
  totalRequests: number;
  successful: number;
  failed: number;
  waiting: number;
  processing: number;
  duplicateBookings: number;
  conflicts: number;
}
