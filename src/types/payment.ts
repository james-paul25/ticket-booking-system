import type { PaymentStatus } from "./database";

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  transaction_reference: string;
  paid_at: string | null;
  created_at: string;
}
