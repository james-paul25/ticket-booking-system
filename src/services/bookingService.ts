import { supabase } from "./supabase";
import type { Booking } from "@/types/booking";

export const bookingService = {
  async listMine(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedule:schedules(*), seat:seats(*)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as unknown as Booking[];
  },

  async getById(id: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedule:schedules(*), seat:seats(*)")
      .eq("id", id)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw new Error(error.message);
    }
    return data as unknown as Booking;
  },

  // Wraps the cancel_booking RPC — the only sanctioned way to cancel.
  async cancel(bookingId: string, reason: string): Promise<Booking> {
    const { data, error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: reason,
    });
    if (error) throw new Error(error.message);
    return data as Booking;
  },

  async listAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedule:schedules(*), seat:seats(*), user:profiles(id, email, full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data as unknown as Booking[];
  },
};
