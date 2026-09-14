import { supabase } from "./supabase";
import type {
  Schedule,
  ScheduleFilters,
  PaginationParams,
  PaginatedSchedules,
  PaginatedResult,
} from "@/types/schedule";
import { getRollingMaritimeSchedules, REAL_SCHEDULE_TEMPLATES } from "@/data/realSchedules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEFAULT_PAGE_SIZE = 10;
// Hard ceiling so a bad/forged pageSize param can't be used to request the
// whole table in one shot — defeats the point of paginating.
const MAX_PAGE_SIZE = 50;

// Keyword lists used to classify a vehicle_name into "fastcraft" vs "roro".
// Kept in one place so the DB query (ilike/or) and the local maritime
// registry fallback always agree on what counts as which category.
const FASTCRAFT_KEYWORDS = [
  "oceanjet",
  "supercat",
  "fastcat",
  "island water",
  "clemer",
  "joy express",
  "fastcraft",
];

const RORO_KEYWORDS = [
  "lite ferry",
  "super shuttle",
  "medallion",
  "trans-asia",
  "roro",
  "liner",
];

function keywordsForVehicleType(vehicleType: "fastcraft" | "roro"): string[] {
  return vehicleType === "fastcraft" ? FASTCRAFT_KEYWORDS : RORO_KEYWORDS;
}

function matchesVehicleType(vehicleName: string, vehicleType?: "all" | "fastcraft" | "roro"): boolean {
  if (!vehicleType || vehicleType === "all") return true;
  const name = vehicleName.toLowerCase();
  return keywordsForVehicleType(vehicleType).some((kw) => name.includes(kw));
}

/**
 * Builds a Postgres `.or()` filter string matching any of the keywords
 * against `vehicle_name`, e.g. "vehicle_name.ilike.%oceanjet%,vehicle_name.ilike.%supercat%,...".
 * This lets the fastcraft/roro category filter run server-side (so
 * `count: "exact"` and pagination stay accurate) instead of being applied
 * after the page is fetched.
 */
function vehicleTypeOrFilter(vehicleType: "fastcraft" | "roro"): string {
  return keywordsForVehicleType(vehicleType)
    .map((kw) => `vehicle_name.ilike.%${kw}%`)
    .join(",");
}

/**
 * Returns the current date/time split into a departure_date-shaped string
 * ("YYYY-MM-DD") and a departure_time-shaped string ("HH:MM:SS"), both in
 * the viewer's local time, matching how `schedules` rows are stored.
 */
function nowAsDateAndTime(): { today: string; nowTime: string } {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(
    2,
    "0"
  )}:${String(now.getSeconds()).padStart(2, "0")}`;
  return { today, nowTime };
}

/**
 * Postgres `.or()` condition matching rows that haven't departed yet:
 * either the departure date is strictly in the future, or it's today and
 * the departure time hasn't passed. Without this, "soonest departures"
 * queries (ordered by date/time ascending, no lower bound) will happily
 * return sailings from days ago, since a past date still sorts first.
 */
function futureDepartureOrFilter(): string {
  const { today, nowTime } = nowAsDateAndTime();
  return `departure_date.gt.${today},and(departure_date.eq.${today},departure_time.gte.${nowTime})`;
}

function isFutureDeparture(schedule: Schedule): boolean {
  const { today, nowTime } = nowAsDateAndTime();
  if (schedule.departure_date > today) return true;
  if (schedule.departure_date < today) return false;
  return schedule.departure_time >= nowTime;
}

function clampPage(page: number): number {
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

function clampPageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.floor(pageSize), MAX_PAGE_SIZE);
}

function toPaginatedResult<T>(
  data: T[],
  count: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const totalPages = count === 0 ? 1 : Math.ceil(count / pageSize);
  return {
    data,
    count,
    page,
    pageSize,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

function applyCommonFilters<T extends { origin: string; destination: string; departure_date: string; price: number; available_seats: number }>(
  query: any,
  filters: ScheduleFilters
) {
  if (filters.origin) query = query.ilike("origin", `%${filters.origin}%`);
  if (filters.destination) query = query.ilike("destination", `%${filters.destination}%`);
  if (filters.date) query = query.eq("departure_date", filters.date);
  if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
  if (filters.onlyAvailable) query = query.gt("available_seats", 0);
  if (filters.vehicleType && filters.vehicleType !== "all") {
    query = query.or(vehicleTypeOrFilter(filters.vehicleType));
  }
  if (filters.onlyFutureDepartures) {
    query = query.or(futureDepartureOrFilter());
  }
  return query;
}

function filterMaritimeList(maritimeList: Schedule[], filters: ScheduleFilters): Schedule[] {
  let list = maritimeList;

  if (filters.origin) {
    const orig = filters.origin.toLowerCase().trim().split(" ")[0];
    list = list.filter((s) => s.origin.toLowerCase().includes(orig));
  }
  if (filters.destination) {
    const dest = filters.destination.toLowerCase().trim().split(" ")[0];
    list = list.filter((s) => s.destination.toLowerCase().includes(dest));
  }
  if (filters.date) {
    list = list.filter((s) => s.departure_date === filters.date);
  }
  if (filters.maxPrice) {
    list = list.filter((s) => s.price <= (filters.maxPrice as number));
  }
  if (filters.onlyAvailable) {
    list = list.filter((s) => s.available_seats > 0);
  }
  if (filters.vehicleType && filters.vehicleType !== "all") {
    list = list.filter((s) => matchesVehicleType(s.vehicle_name, filters.vehicleType));
  }
  if (filters.onlyFutureDepartures) {
    list = list.filter((s) => isFutureDeparture(s));
  }

  return list;
}

function sortSchedules(list: Schedule[]): Schedule[] {
  return [...list].sort((a, b) => {
    const dateCompare = a.departure_date.localeCompare(b.departure_date);
    if (dateCompare !== 0) return dateCompare;
    return a.departure_time.localeCompare(b.departure_time);
  });
}

export const scheduleService = {
  /**
   * Unbounded listing — kept as-is for existing callers (e.g. widgets that
   * just want "all upcoming sailings" without paging UI). Prefer
   * `listPage()` for anything rendering a browsable list, since this
   * fetches every matching row in one request.
   */
  async list(filters: ScheduleFilters = {}): Promise<Schedule[]> {
    try {
      let query = supabase.from("schedules").select("*").order("departure_date", { ascending: true });
      query = applyCommonFilters(query, filters);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return sortSchedules(data as Schedule[]);
      }
    } catch {
      // Fallback seamlessly to verified maritime registry if remote is unavailable
    }

    // Fallback only if database is completely empty or unreachable.
    // NOTE: rows returned from here have synthetic `tpl-...` ids and are not
    // yet real schedules — bookingService.saveBooking materializes them into
    // real Supabase rows the moment a customer actually tries to book one.
    const maritimeList = filterMaritimeList(getRollingMaritimeSchedules(14), filters);
    return sortSchedules(maritimeList);
  },

  /**
   * Paginated schedule listing. Fetches exactly one page of rows via
   * Postgres `range()` plus an exact row count, instead of `list()`'s
   * full-table fetch — this is what keeps the Schedules page fast as the
   * table grows past a handful of rows.
   *
   * The `vehicleType` filter (fastcraft/roro) is applied server-side via
   * an `.or()` ilike match on `vehicle_name`, rather than after the page
   * is fetched — otherwise the exact count and page math would be based
   * on unfiltered rows and go stale the moment a category filter is on.
   *
   * Falls back to slicing the local maritime registry the same way
   * `list()` does, so pagination behaves identically whether or not the DB
   * has real inventory for the given filters.
   */
  async listPage(
    filters: ScheduleFilters = {},
    pagination: PaginationParams = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
  ): Promise<PaginatedSchedules> {
    const page = clampPage(pagination.page);
    const pageSize = clampPageSize(pagination.pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    try {
      let query = supabase
        .from("schedules")
        .select("*", { count: "exact" })
        .order("departure_date", { ascending: true })
        .order("departure_time", { ascending: true })
        .range(from, to);
      query = applyCommonFilters(query, filters);

      const { data, error, count } = await query;
      if (!error && data) {
        return toPaginatedResult(data as Schedule[], count ?? data.length, page, pageSize);
      }
    } catch {
      // Fall through to the local maritime registry, same as list().
    }

    const maritimeList = sortSchedules(filterMaritimeList(getRollingMaritimeSchedules(14), filters));

    const count = maritimeList.length;
    const pageData = maritimeList.slice(from, to + 1);
    return toPaginatedResult(pageData, count, page, pageSize);
  },

  async getById(id: string): Promise<Schedule | null> {
    if (UUID_RE.test(id)) {
      const { data, error } = await supabase.from("schedules").select("*").eq("id", id).single();
      if (error) throw new Error(`Failed to load schedule: ${error.message}`);
      return data as Schedule;
    }

    const allSchedules = getRollingMaritimeSchedules(30);
    const found = allSchedules.find((s) => s.id === id);
    if (found) return found;

    if (id.includes("tpl-")) {
      const tpl = findTemplateForId(id);
      if (tpl) {
        const dateStr = dateFromTemplateId(id);
        return {
          id,
          route_name: tpl.routeName,
          origin: tpl.origin,
          destination: tpl.destination,
          departure_date: dateStr,
          departure_time: `${tpl.departureTime}:00`,
          arrival_time: `${tpl.arrivalTime}:00`,
          vehicle_name: tpl.vehicleName,
          vehicle_number: tpl.vehicleNumber,
          total_seats: tpl.totalSeats,
          available_seats: Math.max(12, tpl.totalSeats - 35),
          price: tpl.price,
          business_price: tpl.businessPrice,
          status: "scheduled",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    return null;
  },

  /**
   * Turns a synthetic `tpl-...` fallback schedule into a real, bookable
   * `schedules` row (with real `seats` rows) via a SECURITY DEFINER RPC.
   * Idempotent server-side: concurrent callers for the same sailing all
   * resolve to the same schedule row instead of creating duplicates.
   *
   * Regular customers can't INSERT into `schedules` directly (admin-only
   * RLS) — this RPC is the sanctioned, narrow exception to that.
   */
  async materializeTemplate(templateScheduleId: string): Promise<Schedule> {
    if (!templateScheduleId.includes("tpl-")) {
      throw new Error(`"${templateScheduleId}" is not a template schedule id.`);
    }

    const tpl = findTemplateForId(templateScheduleId);
    if (!tpl) {
      throw new Error(`No schedule template matches "${templateScheduleId}".`);
    }
    const departureDate = dateFromTemplateId(templateScheduleId);

    const { data, error } = await supabase.rpc("materialize_template_schedule", {
      p_template_id: tpl.templateId,
      p_departure_date: departureDate,
      p_route_name: tpl.routeName,
      p_origin: tpl.origin,
      p_destination: tpl.destination,
      p_departure_time: `${tpl.departureTime}:00`,
      p_arrival_time: `${tpl.arrivalTime}:00`,
      p_vehicle_name: tpl.vehicleName,
      p_vehicle_number: tpl.vehicleNumber,
      p_price: tpl.price,
      p_business_price: tpl.businessPrice ?? null,
    });

    if (error) {
      throw new Error(`Failed to prepare schedule for booking: ${error.message}`);
    }
    return data as Schedule;
  },

  // --- Admin-only writes (protected by RLS on the server) ---
  async create(input: Omit<Schedule, "id" | "created_at" | "updated_at">): Promise<Schedule> {
    const { data, error } = await supabase.from("schedules").insert(input).select().single();
    if (error) throw new Error(error.message);
    return data as Schedule;
  },

  async update(id: string, input: Partial<Schedule>): Promise<Schedule> {
    const { data, error } = await supabase.from("schedules").update(input).eq("id", id).select().single();
    if (error) throw new Error(error.message);
    return data as Schedule;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) throw new Error(error.message);
  },
};

function dateFromTemplateId(id: string): string {
  const parts = id.split("-");
  return parts.slice(-3).join("-");
}

function findTemplateForId(id: string) {
  const parts = id.split("-");
  const templateId = parts.slice(0, -3).join("-");
  return REAL_SCHEDULE_TEMPLATES.find((t) => t.templateId === templateId);
}