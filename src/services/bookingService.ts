import { supabase } from "./supabase";
import type { Booking } from "@/types/booking";
import { seatService } from "./seatService";
import { scheduleService } from "./scheduleService";

const LOCAL_CACHE_KEY = "seqbook_custom_bookings";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Local storage is now a *read cache* for instant UI, never the source of
 * truth. Every write goes through Supabase first; the cache is only ever
 * updated with what Supabase actually confirmed.
 */
function readCache(): Booking[] {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    return JSON.parse(localStorage.getItem(LOCAL_CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeCache(bookings: Booking[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(bookings));
  } catch (e) {
    // Cache write failures are non-fatal — Supabase already has the real data.
    console.warn("Failed to update local booking cache", e);
  }
}

function upsertCache(booking: Booking): void {
  const existing = readCache();
  const filtered = existing.filter(
    (b) => b.id !== booking.id && b.booking_reference !== booking.booking_reference
  );
  writeCache([booking, ...filtered]);
}

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("You must be signed in to book a seat.");
  }
  return data.user.id;
}

export const bookingService = {
  /**
   * Persists a booking to Supabase. Throws on failure instead of silently
   * degrading to a local-only booking — a booking that only exists in
   * localStorage is not a real booking (it disappears on another device,
   * another browser, or a cleared cache).
   *
   * `booking.schedule_id` may be a synthetic `tpl-...` id (a fallback
   * schedule shown when the DB had no real inventory for that route/date —
   * see scheduleService.list). Those aren't real rows yet, so we
   * materialize them into real schedule + seat rows on first booking
   * attempt, then book against the resulting real ids.
   */
  async saveBooking(booking: Booking): Promise<Booking> {
    const seatNumber = booking.seat?.seat_number;
    if (!seatNumber) {
      throw new Error("Cannot save booking: no seat was selected.");
    }

    let scheduleId = booking.schedule_id;
    if (!UUID_RE.test(scheduleId)) {
      const materialized = await scheduleService.materializeTemplate(scheduleId);
      scheduleId = materialized.id;
    }

    // Trust the authenticated session for user_id, not whatever the caller passed in.
    const authedUserId = await getCurrentUserId();

    // Resolve the real seat row now that the schedule is guaranteed real.
    // (booking.seat_id from a template deck is a synthetic `seat-tpl-...`
    // id and can't be trusted — look the real one up by seat_number.)
    const { data: seatRow, error: seatLookupError } = await supabase
      .from("seats")
      .select("id")
      .eq("schedule_id", scheduleId)
      .eq("seat_number", seatNumber)
      .single();

    if (seatLookupError || !seatRow) {
      throw new Error(`Seat ${seatNumber} could not be found for this schedule.`);
    }
    const seatId = seatRow.id as string;

    // Reserve the seat first (throws if someone else just took it).
    await seatService.lockSeat(scheduleId, seatNumber, seatId);

    const { data, error } = await supabase
      .from("bookings")
      .upsert({
        id: booking.id,
        booking_reference: booking.booking_reference,
        user_id: authedUserId,
        schedule_id: scheduleId,
        seat_id: seatId,
        booking_status: booking.booking_status,
        total_amount: booking.total_amount,
        booked_at: booking.booked_at || new Date().toISOString(),
      })
      .select("*, schedule:schedules(*), seat:seats(*)")
      .single();

    if (error) {
      // Roll back the seat lock we just took, since the booking didn't persist.
      await seatService.releaseSeat(scheduleId, seatNumber).catch(() => {});
      throw new Error(`Failed to save booking: ${error.message}`);
    }

    const saved = data as unknown as Booking;
    upsertCache(saved); // cache mirrors confirmed server state only
    return saved;
  },

  /**
   * Source of truth is Supabase. RLS should already scope rows to
   * auth.uid(), but we filter explicitly too (defense in depth, and it
   * fails loudly instead of silently returning someone else's rows if RLS
   * is ever misconfigured).
   */
  async listMine(): Promise<Booking[]> {
    const authedUserId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("bookings")
      .select("*, schedule:schedules(*), seat:seats(*)")
      .eq("user_id", authedUserId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load bookings: ${error.message}`);
    }

    const dbBookings = (data ?? []) as unknown as Booking[];
    writeCache(dbBookings); // refresh cache from confirmed server state
    return dbBookings;
  },

  async getById(id: string): Promise<Booking | null> {
    if (UUID_RE.test(id)) {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, schedule:schedules(*), seat:seats(*)")
        .or(`id.eq.${id},booking_reference.eq.${id}`)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to load booking: ${error.message}`);
      }
      if (data) {
        const booking = data as unknown as Booking;
        upsertCache(booking);
        return booking;
      }
      return null;
    }

    // Non-UUID ids are booking_reference lookups where the row might only
    // exist in the cache during an in-flight demo/offline flow.
    const cached = readCache().find((b) => b.id === id || b.booking_reference === id);
    return cached ?? null;
  },

  // Wraps the cancel_booking RPC — the only sanctioned way to cancel.
  // The RPC computes the real refund amount and writes booking_cancellations;
  // we never fabricate a cancelled state client-side.
  async cancel(bookingId: string, reason: string): Promise<Booking> {
    if (!UUID_RE.test(bookingId)) {
      throw new Error(`Cannot cancel booking: "${bookingId}" is not a valid booking UUID.`);
    }

    const { data, error } = await supabase.rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: reason,
    });

    if (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`);
    }

    const cancelled = data as Booking;
    upsertCache(cancelled); // reflect the server's actual result, not a guess
    return cancelled;
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