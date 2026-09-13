import { supabase } from "./supabase";
import type { Booking } from "@/types/booking";
import { seatService } from "./seatService";

export const bookingService = {
  async saveBooking(booking: Booking): Promise<Booking> {
    // 1. Persist to local storage for instant synchronized retrieval across pages
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const existing: Booking[] = JSON.parse(localStorage.getItem("seqbook_custom_bookings") || "[]");
        const filtered = existing.filter(
          (b) => b.id !== booking.id && b.booking_reference !== booking.booking_reference
        );
        localStorage.setItem("seqbook_custom_bookings", JSON.stringify([booking, ...filtered]));
      }
    } catch (e) {
      console.error("Failed to save local booking", e);
    }

    // 2. Lock the seat in seat service
    if (booking.schedule_id && booking.seat?.seat_number) {
      await seatService.lockSeat(booking.schedule_id, booking.seat.seat_number);
    }

    // 3. If schedule is real UUID, also attempt to upsert into Supabase
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking.schedule_id);
    if (isUuid) {
      try {
        await supabase.from("bookings").upsert({
          id: booking.id,
          booking_reference: booking.booking_reference,
          user_id: booking.user_id,
          schedule_id: booking.schedule_id,
          seat_id: booking.seat_id,
          booking_status: booking.booking_status,
          total_amount: booking.total_amount,
          booked_at: booking.booked_at || new Date().toISOString(),
        });
      } catch {}
    }

    return booking;
  },

  async listMine(): Promise<Booking[]> {
    let dbBookings: Booking[] = [];
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, schedule:schedules(*), seat:seats(*)")
        .order("created_at", { ascending: false });
      if (!error && data) {
        dbBookings = data as unknown as Booking[];
      }
    } catch {}

    let localBookings: Booking[] = [];
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localBookings = JSON.parse(localStorage.getItem("seqbook_custom_bookings") || "[]");
      }
    } catch {}

    const seenRefs = new Set<string>();
    const seenIds = new Set<string>();
    const combined: Booking[] = [];

    // Local bookings take precedence for immediate UI reflection with complete joined objects
    for (const b of localBookings) {
      if (b.id && !seenIds.has(b.id) && !seenRefs.has(b.booking_reference)) {
        seenIds.add(b.id);
        seenRefs.add(b.booking_reference);
        combined.push(b);
      }
    }

    for (const b of dbBookings) {
      if (b.id && !seenIds.has(b.id) && !seenRefs.has(b.booking_reference)) {
        seenIds.add(b.id);
        seenRefs.add(b.booking_reference);
        combined.push(b);
      }
    }

    return combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  async getById(id: string): Promise<Booking | null> {
    // 1. Check local persistent store
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const localBookings: Booking[] = JSON.parse(
          localStorage.getItem("seqbook_custom_bookings") || "[]"
        );
        const found = localBookings.find((b) => b.id === id || b.booking_reference === id);
        if (found) return found;
      }
    } catch {}

    // 2. Query Supabase if UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, schedule:schedules(*), seat:seats(*)")
        .eq("id", id)
        .single();
      if (!error && data) {
        return data as unknown as Booking;
      }
    }

    return null;
  },

  // Wraps the cancel_booking RPC — the only sanctioned way to cancel.
  async cancel(bookingId: string, reason: string): Promise<Booking> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const localBookings: Booking[] = JSON.parse(
          localStorage.getItem("seqbook_custom_bookings") || "[]"
        );
        const updated = localBookings.map((b) => {
          if (b.id === bookingId) {
            return {
              ...b,
              booking_status: "cancelled" as const,
              cancelled_at: new Date().toISOString(),
              cancellation_reason: reason,
            };
          }
          return b;
        });
        localStorage.setItem("seqbook_custom_bookings", JSON.stringify(updated));
      }
    } catch {}

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(bookingId);
    if (isUuid) {
      const { data, error } = await supabase.rpc("cancel_booking", {
        p_booking_id: bookingId,
        p_reason: reason,
      });
      if (error) throw new Error(error.message);
      return data as Booking;
    }

    return {
      id: bookingId,
      booking_status: "cancelled",
      cancellation_reason: reason,
    } as Booking;
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
