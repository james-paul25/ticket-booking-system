import { supabase } from "./supabase";
import type { Seat } from "@/types/seat";

export const seatService = {
  async listForSchedule(scheduleId: string): Promise<Seat[]> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleId);
    if (isUuid) {
      try {
        const { data, error } = await supabase
          .from("seats")
          .select("*")
          .eq("schedule_id", scheduleId)
          .order("seat_number", { ascending: true });
        if (!error && data && data.length > 0) {
          // Normalize legacy seat types into explicit economy and business tiers
          return (data as Seat[]).map((seat) => {
            const rawType = (seat.seat_type || "").toLowerCase();
            const normalizedType =
              rawType === "business" || rawType === "premium" || rawType === "first" || rawType === "vip"
                ? "business"
                : "economy";
            return {
              ...seat,
              seat_type: normalizedType,
            };
          });
        }
      } catch {
        // Fallback to generated deck seats
      }
    }

    // Auto-generate realistic vessel deck seats for both Economy and Business classes
    const fallbackSeats: Seat[] = [];
    const ecoRows = ["A", "B", "C", "D", "E", "F"];
    const bizRows = ["J", "K", "L"];

    // 1. Economy Class Deck: Rows A to F (24 seats)
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

    // 2. Business Class VIP Deck: Rows J to L (12 seats)
    for (const row of bizRows) {
      for (let col = 1; col <= 4; col++) {
        const isBooked = (row === "K" && col === 2);
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
  },

  async getBookedSeatLabels(scheduleId: string): Promise<string[]> {
    const baseOccupied = ["1A", "2C", "3D", "5B", "8E", "10F", "J2A", "J4D"];
    const booked = new Set<string>(baseOccupied);

    // 1. Check persistent allocations
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem("seqbook_allocated_seats");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed[scheduleId])) {
            parsed[scheduleId].forEach((lbl: string) => booked.add(lbl));
          }
        }
        // Also check any persistent stored bookings
        const bookingsStored = localStorage.getItem("seqbook_custom_bookings");
        if (bookingsStored) {
          const bookings = JSON.parse(bookingsStored);
          if (Array.isArray(bookings)) {
            bookings.forEach((b: any) => {
              if (b.schedule_id === scheduleId && b.seat?.seat_number) {
                booked.add(b.seat.seat_number);
              }
            });
          }
        }
      }
    } catch {}

    // 2. Query Supabase database seats if valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleId);
    if (isUuid) {
      try {
        const { data } = await supabase
          .from("seats")
          .select("seat_number, status")
          .eq("schedule_id", scheduleId)
          .in("status", ["booked", "reserved", "blocked"]);
        if (data) {
          data.forEach((s) => booked.add(s.seat_number));
        }
      } catch {}
    }

    return Array.from(booked);
  },

  async lockSeat(scheduleId: string, seatNumber: string): Promise<void> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem("seqbook_allocated_seats");
        const parsed = stored ? JSON.parse(stored) : {};
        if (!Array.isArray(parsed[scheduleId])) {
          parsed[scheduleId] = [];
        }
        if (!parsed[scheduleId].includes(seatNumber)) {
          parsed[scheduleId].push(seatNumber);
        }
        localStorage.setItem("seqbook_allocated_seats", JSON.stringify(parsed));
      }
    } catch {}

    // If UUID schedule, update DB seat status
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleId);
    if (isUuid) {
      try {
        await supabase
          .from("seats")
          .update({ status: "booked" })
          .eq("schedule_id", scheduleId)
          .eq("seat_number", seatNumber);
      } catch {}
    }
  },

  // Realtime subscription so the seat map updates live as the sequential
  // processor books/frees seats — useful during the demo.
  subscribeToSchedule(scheduleId: string, onChange: () => void) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleId);
    if (!isUuid) {
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
