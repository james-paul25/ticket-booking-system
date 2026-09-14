import { supabase } from "./supabase";
import type { Schedule, ScheduleFilters } from "@/types/schedule";
import { getRollingMaritimeSchedules, REAL_SCHEDULE_TEMPLATES } from "@/data/realSchedules";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const scheduleService = {
  async list(filters: ScheduleFilters = {}): Promise<Schedule[]> {
    try {
      let query = supabase.from("schedules").select("*").order("departure_date", { ascending: true });

      if (filters.origin) query = query.ilike("origin", `%${filters.origin}%`);
      if (filters.destination) query = query.ilike("destination", `%${filters.destination}%`);
      if (filters.date) query = query.eq("departure_date", filters.date);
      if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters.onlyAvailable) query = query.gt("available_seats", 0);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const sorted = (data as Schedule[]).sort((a, b) => {
          const dateCompare = a.departure_date.localeCompare(b.departure_date);
          if (dateCompare !== 0) return dateCompare;
          return a.departure_time.localeCompare(b.departure_time);
        });
        return sorted;
      }
    } catch {
      // Fallback seamlessly to verified maritime registry if remote is unavailable
    }

    // Fallback only if database is completely empty or unreachable.
    // NOTE: rows returned from here have synthetic `tpl-...` ids and are not
    // yet real schedules — bookingService.saveBooking materializes them into
    // real Supabase rows the moment a customer actually tries to book one.
    let maritimeList = getRollingMaritimeSchedules(14);

    if (filters.origin) {
      const orig = filters.origin.toLowerCase().trim().split(" ")[0];
      maritimeList = maritimeList.filter((s) => s.origin.toLowerCase().includes(orig));
    }
    if (filters.destination) {
      const dest = filters.destination.toLowerCase().trim().split(" ")[0];
      maritimeList = maritimeList.filter((s) => s.destination.toLowerCase().includes(dest));
    }
    if (filters.date) {
      maritimeList = maritimeList.filter((s) => s.departure_date === filters.date);
    }
    if (filters.maxPrice) {
      maritimeList = maritimeList.filter((s) => s.price <= (filters.maxPrice as number));
    }
    if (filters.onlyAvailable) {
      maritimeList = maritimeList.filter((s) => s.available_seats > 0);
    }

    return maritimeList.sort((a, b) => {
      const dateCompare = a.departure_date.localeCompare(b.departure_date);
      if (dateCompare !== 0) return dateCompare;
      return a.departure_time.localeCompare(b.departure_time);
    });
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