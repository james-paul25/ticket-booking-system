import { supabase } from "./supabase";
import type { Seat } from "@/types/seat";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const seatService = {
  /**
   * For a real (UUID) schedule, Supabase is the only source of truth.
   * For a demo/offline schedule id, we still generate a deterministic
   * fallback deck — that behavior is unchanged, but it's now clearly
   * separated from the real-data path instead of being a silent fallback
   * triggered by a swallowed error.
   */
  async listForSchedule(scheduleId: string): Promise<Seat[]> {
    if (UUID_RE.test(scheduleId)) {
      const { data, error } = await supabase
        .from("seats")
        .select("*")
        .eq("schedule_id", scheduleId)
        .order("seat_number", { ascending: true });

      if (error) {
        throw new Error(`Failed to load seats: ${error.message}`);
      }

      return (data as Seat[]).map((seat) => {
        const rawType = (seat.seat_type || "").toLowerCase();
        const normalizedType =
          rawType === "business" || rawType === "premium" || rawType === "first" || rawType === "vip"
            ? "business"
            : "economy";
        return { ...seat, seat_type: normalizedType };
      });
    }

    return generateFallbackDeck(scheduleId);
  },

  async getBookedSeatLabels(scheduleId: string): Promise<string[]> {
    if (UUID_RE.test(scheduleId)) {
      const { data, error } = await supabase
        .from("seats")
        .select("seat_number, status")
        .eq("schedule_id", scheduleId)
        .in("status", ["booked", "reserved", "blocked"]);

      if (error) {
        throw new Error(`Failed to load seat availability: ${error.message}`);
      }
      return (data ?? []).map((s) => s.seat_number);
    }

    // Demo schedule: baseline occupied seats for a believable seat map.
    return ["1A", "2C", "3D", "5B", "8E", "10F", "J2A", "J4D"];
  },

  /**
   * Reserves a seat. For real schedules this is a conditional update
   * (status must currently be 'available') so two users racing for the
   * same seat can't both succeed — the loser gets a thrown error instead
   * of a silently-corrupted seat map.
   *
   * NOTE: this is optimistic-concurrency, not a true transaction. For
   * stronger guarantees, move this into a `book_seat` Postgres function
   * (SELECT ... FOR UPDATE + insert booking) called via supabase.rpc, so
   * the seat lock and the booking insert commit atomically.
   */
  async lockSeat(scheduleId: string, seatNumber: string, seatId?: string): Promise<void> {
    if (!UUID_RE.test(scheduleId)) return; // demo schedules have no real seat rows to lock

    const query = supabase
      .from("seats")
      .update({ status: "booked" })
      .eq("schedule_id", scheduleId)
      .eq("seat_number", seatNumber)
      .eq("status", "available");

    const { data, error } = await (seatId ? query.eq("id", seatId) : query).select("id");

    if (error) {
      throw new Error(`Failed to reserve seat ${seatNumber}: ${error.message}`);
    }
    if (!data || data.length === 0) {
      throw new Error(`Seat ${seatNumber} is no longer available.`);
    }
  },

  /** Releases a seat back to available — used to roll back a lock when the booking write fails. */
  async releaseSeat(scheduleId: string, seatNumber: string): Promise<void> {
    if (!UUID_RE.test(scheduleId)) return;

    const { error } = await supabase
      .from("seats")
      .update({ status: "available" })
      .eq("schedule_id", scheduleId)
      .eq("seat_number", seatNumber);

    if (error) {
      console.error(`Failed to release seat ${seatNumber} after a failed booking`, error);
    }
  },

  // Realtime subscription so the seat map updates live as bookings come in.
  subscribeToSchedule(scheduleId: string, onChange: () => void) {
    if (!UUID_RE.test(scheduleId)) {
      return () => {};
    }

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

function generateFallbackDeck(scheduleId: string): Seat[] {
  const fallbackSeats: Seat[] = [];
  const ecoRows = ["A", "B", "C", "D", "E", "F"];
  const bizRows = ["J", "K", "L"];

  for (const row of ecoRows) {
    for (let col = 1; col <= 4; col++) {
      const isBooked = (row === "B" && col === 2) || (row === "D" && col === 3) || (row === "E" && col === 1);
      fallbackSeats.push({
        id: `seat-${scheduleId}-${row}${col}`,
        schedule_id: scheduleId,
        seat_number: `${row}${col}`,
        seat_type: "economy",
        price: 800,
        status: isBooked ? "booked" : "available",
        created_at: new Date().toISOString(),
      });
    }
  }

  for (const row of bizRows) {
    for (let col = 1; col <= 4; col++) {
      const isBooked = row === "K" && col === 2;
      fallbackSeats.push({
        id: `seat-${scheduleId}-${row}${col}`,
        schedule_id: scheduleId,
        seat_number: `${row}${col}`,
        seat_type: "business",
        price: 1160,
        status: isBooked ? "booked" : "available",
        created_at: new Date().toISOString(),
      });
    }
  }

  return fallbackSeats;
}