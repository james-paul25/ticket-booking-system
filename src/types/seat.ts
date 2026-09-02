import type { SeatStatus } from "./database";

export interface Seat {
  id: string;
  schedule_id: string;
  seat_number: string;
  seat_type: string;
  price: number;
  status: SeatStatus;
  created_at: string;
}
