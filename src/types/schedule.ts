import type { ScheduleStatus } from "./database";

export interface Schedule {
  id: string;
  route_name: string;
  origin: string;
  destination: string;
  departure_date: string;
  departure_time: string;
  arrival_time: string;
  vehicle_name: string;
  vehicle_number: string;
  total_seats: number;
  available_seats: number;
  price: number;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
}

export interface ScheduleFilters {
  origin?: string;
  destination?: string;
  date?: string;
  maxPrice?: number;
  onlyAvailable?: boolean;
}
