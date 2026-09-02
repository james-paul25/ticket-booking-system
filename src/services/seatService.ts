import { supabase } from "./supabase";
import type { Seat } from "@/types/seat";

export const seatService = {
  async listForSchedule(scheduleId: string): Promise<Seat[]> {
    const { data, error } = await supabase
      .from("seats")
      .select("*")
      .eq("schedule_id", scheduleId)
      .order("seat_number", { ascending: true });
    if (error) throw new Error(error.message);
    return data as Seat[];
  },

  // Realtime subscription so the seat map updates live as the sequential
  // processor books/frees seats — useful during the demo.
  subscribeToSchedule(scheduleId: string, onChange: () => void) {
    const channel = supabase
      .channel(`seats-schedule-${scheduleId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "seats", filter: `schedule_id=eq.${scheduleId}` },
        onChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
