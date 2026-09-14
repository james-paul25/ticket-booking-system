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
  business_price?: number;
  status: ScheduleStatus;
  created_at: string;
  updated_at: string;
  category?: "fastcraft" | "roro";
  operator?: string;
}

export interface ScheduleFilters {
  origin?: string;
  destination?: string;
  date?: string;
  maxPrice?: number;
  onlyAvailable?: boolean;
  /**
   * Vehicle category filter, applied server-side (via a `vehicle_name`
   * keyword match) so that pagination counts stay accurate. Omit or pass
   * "all" for no filtering.
   */
  vehicleType?: "all" | "fastcraft" | "roro";
  /**
   * When true, excludes sailings whose departure date/time has already
   * passed. Use for "soonest upcoming" boards — without it, an
   * ascending date/time sort with no lower bound will happily surface
   * sailings from days ago, since a past date still sorts first.
   */
  onlyFutureDepartures?: boolean;
}

/** 1-based page number and rows-per-page for scheduleService.listPage(). */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

/**
 * Result of a paginated fetch. Generic so it isn't schedule-specific —
 * reusable for bookings, seats, or anything else that grows a "load more
 * / page 2" requirement later.
 *
 * `count` is the total number of rows matching the filters (not just this
 * page), computed server-side via Postgres's `count: "exact"`, so the UI
 * can render "Page 2 of 7" without a second round-trip.
 */
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type PaginatedSchedules = PaginatedResult<Schedule>;