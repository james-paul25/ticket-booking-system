-- ============================================================================
-- Migration 0003: RPC functions
--
-- These functions are the ONLY way seats/bookings/payments/schedule counters
-- are ever mutated. The frontend never issues raw UPDATE/INSERT against
-- seats, bookings, or schedules directly (see RLS in 0002).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- submit_booking_request
-- Customer-callable. Validates the seat/schedule pairing and enqueues a
-- request. Returns the new queue row (with its request_number = queue
-- position ordering key).
-- ----------------------------------------------------------------------------
create or replace function submit_booking_request(
  p_schedule_id uuid,
  p_seat_id uuid
)
returns booking_queue
language plpgsql
security invoker
as $$
declare
  v_seat seats;
  v_schedule schedules;
  v_queue booking_queue;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_schedule from schedules where id = p_schedule_id;
  if not found then
    raise exception 'Invalid schedule';
  end if;
  if v_schedule.status not in ('scheduled', 'boarding') then
    raise exception 'Schedule is not open for booking';
  end if;

  select * into v_seat from seats where id = p_seat_id and schedule_id = p_schedule_id;
  if not found then
    raise exception 'Invalid seat for this schedule';
  end if;

  -- Prevent the same user from queueing duplicate requests for the same seat
  -- while an earlier one of theirs is still waiting/processing.
  if exists (
    select 1 from booking_queue
    where seat_id = p_seat_id
      and user_id = auth.uid()
      and status in ('waiting', 'processing')
  ) then
    raise exception 'You already have a pending request for this seat';
  end if;

  insert into booking_queue (user_id, schedule_id, seat_id, status)
  values (auth.uid(), p_schedule_id, p_seat_id, 'waiting')
  returning * into v_queue;

  insert into processing_logs (queue_id, request_number, action, message)
  values (v_queue.id, v_queue.request_number, 'QUEUED',
          format('Request #%s queued for seat %s', v_queue.request_number, v_seat.seat_number));

  return v_queue;
end;
$$;

-- ----------------------------------------------------------------------------
-- claim_next_queue_request
-- Atomically claims the single next "waiting" request (lowest request_number)
-- system-wide and marks it "processing". The partial unique index
-- uq_single_processing_slot guarantees at most one row can be "processing"
-- at any moment, so this is the database-level enforcement of "one request
-- at a time" — independent of whatever the frontend does.
--
-- FOR UPDATE SKIP LOCKED means concurrent callers of this function never
-- pick the same row, but only one of them will ever succeed in flipping a
-- row to 'processing' before hitting the unique index if something raced
-- past the SKIP LOCKED window; that caller's transaction is retried by the
-- application.
-- ----------------------------------------------------------------------------
create or replace function claim_next_queue_request()
returns booking_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue booking_queue;
begin
  select * into v_queue
  from booking_queue
  where status = 'waiting'
  order by request_number asc
  for update skip locked
  limit 1;

  if not found then
    return null;
  end if;

  update booking_queue
  set status = 'processing',
      processing_started_at = now()
  where id = v_queue.id
  returning * into v_queue;

  insert into processing_logs (queue_id, request_number, action, message, processing_started_at)
  values (v_queue.id, v_queue.request_number, 'PROCESSING_STARTED',
          format('Request #%s started processing', v_queue.request_number), v_queue.processing_started_at);

  return v_queue;
end;
$$;

-- ----------------------------------------------------------------------------
-- process_booking_request
-- Does the actual seat check + reservation + booking + payment as ONE
-- atomic PostgreSQL transaction. Must be called with the id of a queue row
-- already claimed (status = 'processing') by claim_next_queue_request().
-- ----------------------------------------------------------------------------
create or replace function process_booking_request(p_queue_id uuid)
returns booking_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue booking_queue;
  v_seat seats;
  v_schedule schedules;
  v_booking bookings;
  v_reference text;
  v_txn_ref text;
  v_started timestamptz := clock_timestamp();
  v_completed timestamptz;
begin
  select * into v_queue from booking_queue where id = p_queue_id for update;
  if not found then
    raise exception 'Queue request not found';
  end if;
  if v_queue.status <> 'processing' then
    raise exception 'Queue request % is not in processing state (status=%)', p_queue_id, v_queue.status;
  end if;

  -- Lock the seat row so no other transaction can act on it concurrently.
  select * into v_seat from seats where id = v_queue.seat_id for update;

  insert into processing_logs (queue_id, request_number, action, message)
  values (v_queue.id, v_queue.request_number, 'SEAT_CHECK',
          format('Checking seat %s (current status: %s)', v_seat.seat_number, v_seat.status));

  if v_seat.status <> 'available' then
    -- -------------------- FAILURE PATH --------------------
    v_completed := clock_timestamp();

    insert into bookings (
      booking_reference, user_id, schedule_id, seat_id,
      booking_status, total_amount
    ) values (
      'TKT-FAIL-' || upper(substr(md5(random()::text), 1, 8)),
      v_queue.user_id, v_queue.schedule_id, v_queue.seat_id,
      'failed', v_seat.price
    ) returning * into v_booking;

    update booking_queue
    set status = 'failed',
        booking_id = v_booking.id,
        processing_completed_at = v_completed,
        result_message = 'FAILED: Seat already booked'
    where id = v_queue.id
    returning * into v_queue;

    insert into processing_logs (queue_id, request_number, action, message, processing_completed_at, processing_duration_ms)
    values (v_queue.id, v_queue.request_number, 'BOOKING_FAILED',
            'FAILED: Seat already booked', v_completed,
            extract(epoch from (v_completed - v_started)) * 1000);

    insert into processing_logs (queue_id, request_number, action, message, processing_completed_at)
    values (v_queue.id, v_queue.request_number, 'PROCESSING_COMPLETED',
            format('Request #%s completed (failed)', v_queue.request_number), v_completed);

    return v_queue;
  end if;

  -- -------------------- SUCCESS PATH --------------------
  update seats set status = 'booked' where id = v_seat.id;

  insert into processing_logs (queue_id, request_number, action, message)
  values (v_queue.id, v_queue.request_number, 'SEAT_RESERVED',
          format('Seat %s reserved', v_seat.seat_number));

  select * into v_schedule from schedules where id = v_queue.schedule_id for update;

  v_reference := 'TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  insert into bookings (
    booking_reference, user_id, schedule_id, seat_id,
    booking_status, total_amount, booked_at
  ) values (
    v_reference, v_queue.user_id, v_queue.schedule_id, v_queue.seat_id,
    'confirmed', v_seat.price, now()
  ) returning * into v_booking;

  insert into processing_logs (queue_id, request_number, action, message)
  values (v_queue.id, v_queue.request_number, 'BOOKING_CREATED',
          format('Booking %s created', v_booking.booking_reference));

  v_txn_ref := 'PAY-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 10));

  insert into payments (
    booking_id, user_id, amount, payment_method, payment_status, transaction_reference, paid_at
  ) values (
    v_booking.id, v_queue.user_id, v_seat.price, 'simulated_card', 'paid', v_txn_ref, now()
  );

  insert into processing_logs (queue_id, request_number, action, message)
  values (v_queue.id, v_queue.request_number, 'PAYMENT_RECORDED',
          format('Payment %s recorded (simulated)', v_txn_ref));

  update schedules
  set available_seats = greatest(available_seats - 1, 0)
  where id = v_schedule.id;

  v_completed := clock_timestamp();

  update booking_queue
  set status = 'completed',
      booking_id = v_booking.id,
      processing_completed_at = v_completed,
      result_message = 'SUCCESS'
  where id = v_queue.id
  returning * into v_queue;

  insert into processing_logs (queue_id, request_number, action, message, processing_completed_at)
  values (v_queue.id, v_queue.request_number, 'BOOKING_CONFIRMED',
          format('Booking %s confirmed', v_booking.booking_reference), v_completed);

  insert into processing_logs (queue_id, request_number, action, message, processing_completed_at, processing_duration_ms)
  values (v_queue.id, v_queue.request_number, 'PROCESSING_COMPLETED',
          format('Request #%s completed (success)', v_queue.request_number), v_completed,
          extract(epoch from (v_completed - v_started)) * 1000);

  return v_queue;
end;
$$;

-- ----------------------------------------------------------------------------
-- run_next_in_queue
-- Convenience wrapper the frontend sequential processor calls once per loop
-- iteration: claim, then process, then return the final state (or null if
-- the queue was empty). Combining these in one round trip keeps the "await
-- before next" pattern simple on the client without weakening atomicity —
-- claim and process each remain their own transaction.
-- ----------------------------------------------------------------------------
create or replace function run_next_in_queue()
returns booking_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed booking_queue;
  v_result booking_queue;
begin
  v_claimed := claim_next_queue_request();
  if v_claimed is null then
    return null;
  end if;
  v_result := process_booking_request(v_claimed.id);
  return v_result;
end;
$$;

-- ----------------------------------------------------------------------------
-- cancel_booking
-- ----------------------------------------------------------------------------
create or replace function cancel_booking(p_booking_id uuid, p_reason text default 'Cancelled by customer')
returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings;
  v_payment payments;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;

  if not (v_booking.user_id = auth.uid() or is_admin()) then
    raise exception 'Not authorized to cancel this booking';
  end if;

  if v_booking.booking_status <> 'confirmed' then
    raise exception 'Only confirmed bookings can be cancelled (current status: %)', v_booking.booking_status;
  end if;

  update bookings
  set booking_status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = p_reason
  where id = v_booking.id
  returning * into v_booking;

  update seats set status = 'available' where id = v_booking.seat_id;

  update schedules
  set available_seats = least(available_seats + 1, total_seats)
  where id = v_booking.schedule_id;

  select * into v_payment from payments where booking_id = v_booking.id;
  if found then
    update payments set payment_status = 'refunded' where id = v_payment.id;
  end if;

  insert into booking_cancellations (booking_id, cancelled_by, reason, refund_amount)
  values (v_booking.id, auth.uid(), p_reason, coalesce(v_payment.amount, v_booking.total_amount));

  return v_booking;
end;
$$;

-- ----------------------------------------------------------------------------
-- reset_sequential_demo (admin only)
-- Resets a schedule to have exactly one available seat and clears prior
-- demo queue/log/booking rows for that seat so "Run 5-Customer Last Seat
-- Test" can be repeated live.
-- ----------------------------------------------------------------------------
create or replace function reset_sequential_demo(p_schedule_id uuid, p_seat_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Admin only';
  end if;

  delete from processing_logs where queue_id in (
    select id from booking_queue where seat_id = p_seat_id
  );
  delete from payments where booking_id in (
    select id from bookings where seat_id = p_seat_id
  );
  delete from booking_cancellations where booking_id in (
    select id from bookings where seat_id = p_seat_id
  );
  delete from booking_queue where seat_id = p_seat_id;
  delete from bookings where seat_id = p_seat_id;

  update seats set status = 'available' where id = p_seat_id;

  update schedules s
  set available_seats = (
    select count(*) from seats where schedule_id = s.id and status = 'available'
  )
  where id = p_schedule_id;
end;
$$;
