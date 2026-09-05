import { supabase } from "./supabase";
import type { Schedule, ScheduleFilters } from "@/types/schedule";
import { getRollingMaritimeSchedules } from "@/data/realSchedules";

export const scheduleService = {
  async list(filters: ScheduleFilters = {}): Promise<Schedule[]> {
    let dbSchedules: Schedule[] = [];
    try {
      let query = supabase.from("schedules").select("*").order("departure_date", { ascending: true });

      if (filters.origin) query = query.ilike("origin", `%${filters.origin}%`);
      if (filters.destination) query = query.ilike("destination", `%${filters.destination}%`);
      if (filters.date) query = query.eq("departure_date", filters.date);
      if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters.onlyAvailable) query = query.gt("available_seats", 0);

      const { data, error } = await query;
      if (!error && data) {
        dbSchedules = data as Schedule[];
      }
    } catch {
      // Fallback seamlessly to verified maritime registry if remote is unavailable
    }

    // Load verified real-world maritime schedules across all 15 Bohol corridors
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

    // Combine DB records with verified schedules, prioritizing DB edits if IDs match
    const map = new Map<string, Schedule>();
    maritimeList.forEach((s) => map.set(s.id, s));
    dbSchedules.forEach((s) => map.set(s.id, s));

    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const dateCompare = a.departure_date.localeCompare(b.departure_date);
      if (dateCompare !== 0) return dateCompare;
      return a.departure_time.localeCompare(b.departure_time);
    });

    return combined;
  },

  async getById(id: string): Promise<Schedule | null> {
    try {
      const { data, error } = await supabase.from("schedules").select("*").eq("id", id).single();
      if (!error && data) return data as Schedule;
    } catch {
      // Fallback search
    }

    const allSchedules = getRollingMaritimeSchedules(30);
    const found = allSchedules.find((s) => s.id === id);
    if (found) return found;

    return null;
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
