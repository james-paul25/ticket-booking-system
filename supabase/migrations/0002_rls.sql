-- ============================================================================
-- Migration 0002: Row Level Security
-- ============================================================================

-- ----------------------------------------------------------------------------
-- helper: is the current user an admin?
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table profiles enable row level security;
alter table schedules enable row level security;
alter table seats enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;
alter table booking_queue enable row level security;
alter table processing_logs enable row level security;
alter table booking_cancellations enable row level security;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on profiles for select
  using (id = auth.uid() or is_admin());

create policy "profiles_update_own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "profiles_admin_all"
  on profiles for all
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- SCHEDULES  — public read, admin write
-- ----------------------------------------------------------------------------
create policy "schedules_select_all"
  on schedules for select
  using (true);

create policy "schedules_admin_write"
  on schedules for insert with check (is_admin());
create policy "schedules_admin_update"
  on schedules for update using (is_admin());
create policy "schedules_admin_delete"
  on schedules for delete using (is_admin());

-- ----------------------------------------------------------------------------
-- SEATS — public read, NO direct customer write (must go through RPC)
-- ----------------------------------------------------------------------------
create policy "seats_select_all"
  on seats for select
  using (true);

create policy "seats_admin_write"
  on seats for insert with check (is_admin());
create policy "seats_admin_update"
  on seats for update using (is_admin());
create policy "seats_admin_delete"
  on seats for delete using (is_admin());
-- Note: intentionally no customer UPDATE policy on seats.
-- Seat status changes only happen inside process_booking_request() (SECURITY DEFINER).

-- ----------------------------------------------------------------------------
-- BOOKINGS — customers see/create their own, cannot alter status directly
-- ----------------------------------------------------------------------------
create policy "bookings_select_own_or_admin"
  on bookings for select
  using (user_id = auth.uid() or is_admin());

create policy "bookings_admin_all"
  on bookings for all
  using (is_admin())
  with check (is_admin());
-- Note: no direct customer INSERT/UPDATE policy — bookings are only ever
-- created/updated inside process_booking_request() or the cancellation RPC,
-- both SECURITY DEFINER, so RLS on this table only needs to gate reads for
-- customers while admin tooling gets full access.

-- ----------------------------------------------------------------------------
-- PAYMENTS — customers see their own only
-- ----------------------------------------------------------------------------
create policy "payments_select_own_or_admin"
  on payments for select
  using (user_id = auth.uid() or is_admin());

create policy "payments_admin_all"
  on payments for all
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- BOOKING QUEUE — customers can insert their own request and watch it,
-- cannot alter status/results directly (only the RPC can).
-- ----------------------------------------------------------------------------
create policy "queue_select_own_or_admin"
  on booking_queue for select
  using (user_id = auth.uid() or is_admin());

create policy "queue_insert_own"
  on booking_queue for insert
  with check (user_id = auth.uid());

create policy "queue_admin_all"
  on booking_queue for all
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- PROCESSING LOGS — admin-only by default (per spec: "unless explicitly
-- allowed"). We allow a customer to see logs tied to their own queue request
-- so the UI can show a live timeline for their own booking.
-- ----------------------------------------------------------------------------
create policy "logs_select_own_or_admin"
  on processing_logs for select
  using (
    is_admin()
    or exists (
      select 1 from booking_queue q
      where q.id = processing_logs.queue_id and q.user_id = auth.uid()
    )
  );

create policy "logs_admin_all"
  on processing_logs for all
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- BOOKING CANCELLATIONS
-- ----------------------------------------------------------------------------
create policy "cancellations_select_own_or_admin"
  on booking_cancellations for select
  using (
    is_admin()
    or exists (
      select 1 from bookings b
      where b.id = booking_cancellations.booking_id and b.user_id = auth.uid()
    )
  );

create policy "cancellations_admin_all"
  on booking_cancellations for all
  using (is_admin())
  with check (is_admin());
