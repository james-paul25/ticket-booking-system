import type { SeatStatus } from "./database";

export type SeatClass = "economy" | "business";

export interface Seat {
  id: string;
  schedule_id: string;
  seat_number: string;
  seat_type: SeatClass | string;
  price: number;
  status: SeatStatus;
  created_at: string;
}

