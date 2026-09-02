import { supabase } from "@/services/supabase";
import type { BookingQueueRequest } from "@/types/queue";

/**
 * sequentialProcessor
 * ---------------------------------------------------------------------
 * This is the client-visible half of Sequential Processing. It repeatedly
 * calls the `run_next_in_queue()` PostgreSQL RPC (claim -> process, one
 * atomic transaction each) and — critically — `await`s each call before
 * starting the next one.
 *
 *     while (pendingRequestsExist) {
 *       const result = await runNextInQueue();   // <-- await, never Promise.all
 *       onProgress(result);
 *     }
 *
 * IMPORTANT: this loop is a convenience for driving the demo from a single
 * browser tab. It is NOT what actually prevents duplicate bookings — that
 * guarantee lives in the database:
 *   - `uq_single_processing_slot` (partial unique index) means only one
 *     booking_queue row can be status='processing' at any instant, system
 *     wide, no matter how many browser tabs/admins are running this loop.
 *   - `uq_one_active_booking_per_seat` (partial unique index) means even a
 *     bug in this client loop could never produce two active bookings for
 *     the same seat.
 * The frontend loop gives you the visible, explainable "one at a time"
 * behavior for the presentation; the database constraints are the actual
 * safety net.
 * ---------------------------------------------------------------------
 */

export type ProcessorEvent =
  | { type: "started" }
  | { type: "requestProcessing"; request: BookingQueueRequest }
  | { type: "requestCompleted"; request: BookingQueueRequest }
  | { type: "idle" }
  | { type: "error"; message: string };

type Listener = (event: ProcessorEvent) => void;

class SequentialProcessor {
  private running = false;

  isRunning() {
    return this.running;
  }

  /** Process every currently-waiting request, one at a time, until the queue is empty. */
  async drainQueue(onEvent?: Listener): Promise<BookingQueueRequest[]> {
    if (this.running) {
      throw new Error("Sequential processor is already running");
    }
    this.running = true;
    onEvent?.({ type: "started" });

    const processed: BookingQueueRequest[] = [];

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        // await — deliberately sequential. Never Promise.all() here.
        const result = await this.runNext();
        if (!result) break; // queue empty
        processed.push(result);
        onEvent?.({ type: "requestCompleted", request: result });
      }
      onEvent?.({ type: "idle" });
    } catch (err) {
      onEvent?.({ type: "error", message: err instanceof Error ? err.message : String(err) });
      throw err;
    } finally {
      this.running = false;
    }

    return processed;
  }

  /** Claim + process exactly one request. Returns null if the queue was empty. */
  async runNext(): Promise<BookingQueueRequest | null> {
    const { data, error } = await supabase.rpc("run_next_in_queue");
    if (error) throw new Error(error.message);
    return (data as BookingQueueRequest) ?? null;
  }
}

// Singleton — a single sequential processor instance drives the whole app,
// matching the "only one request processed at a time" requirement.
export const sequentialProcessor = new SequentialProcessor();
