import { supabase } from "./supabase";
import type { Schedule, ScheduleFilters } from "@/types/schedule";

export const scheduleService = {
  async list(filters: ScheduleFilters = {}): Promise<Schedule[]> {
    let query = supabase.from("schedules").select("*").order("departure_date", { ascending: true });

    if (filters.origin) query = query.ilike("origin", `%${filters.origin}%`);
    if (filters.destination) query = query.ilike("destination", `%${filters.destination}%`);
    if (filters.date) query = query.eq("departure_date", filters.date);
    if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
    if (filters.onlyAvailable) query = query.gt("available_seats", 0);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data as Schedule[];
  },

  async getById(id: string): Promise<Schedule | null> {
    const { data, error } = await supabase.from("schedules").select("*").eq("id", id).single();
    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw new Error(error.message);
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
