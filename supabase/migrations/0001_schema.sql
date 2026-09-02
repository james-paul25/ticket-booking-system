-- ============================================================================
-- ONLINE TICKET BOOKING SYSTEM — GROUP 1: SEQUENTIAL PROCESSING
-- Migration 0001: Core schema
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUM TYPES
-- ----------------------------------------------------------------------------
create type user_role as enum ('customer', 'admin');
create type schedule_status as enum ('scheduled', 'boarding', 'departed', 'completed', 'cancelled');
create type seat_status as enum ('available', 'reserved', 'booked', 'blocked');
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'failed', 'completed');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type queue_status as enum ('waiting', 'processing', 'completed', 'failed', 'cancelled');

-- ----------------------------------------------------------------------------
-- PROFILES  (mirrors auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- SCHEDULES
-- ----------------------------------------------------------------------------
create table schedules (
  id uuid primary key default gen_random_uuid(),
  route_name text not null,
  origin text not null,
  destination text not null,
  departure_date date not null,
  departure_time time not null,
  arrival_time time not null,
  vehicle_name text not null,
  vehicle_number text not null,
  total_seats int not null check (total_seats > 0),
  available_seats int not null check (available_seats >= 0),
  price numeric(10, 2) not null check (price >= 0),
  status schedule_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint available_not_over_total check (available_seats <= total_seats)
);

create index idx_schedules_search on schedules (origin, destination, departure_date);

-- ----------------------------------------------------------------------------
-- SEATS
-- ----------------------------------------------------------------------------
create table seats (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  seat_number text not null,
  seat_type text not null default 'standard',
  price numeric(10, 2) not null,
  status seat_status not null default 'available',
  created_at timestamptz not null default now(),
  unique (schedule_id, seat_number)
);

create index idx_seats_schedule on seats (schedule_id);
create index idx_seats_status on seats (schedule_id, status);

-- ----------------------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  user_id uuid not null references profiles(id) on delete cascade,
  schedule_id uuid not null references schedules(id),
  seat_id uuid not null references seats(id),
  booking_status booking_status not null default 'pending',
  total_amount numeric(10, 2) not null,
  booked_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_user on bookings (user_id);
create index idx_bookings_schedule on bookings (schedule_id);

-- THE CORE DATA-INTEGRITY GUARANTEE:
-- one seat can have at most ONE "active" booking (pending or confirmed) at a time.
-- This partial unique index is what makes duplicate bookings impossible even if
-- the sequential processor were ever bypassed.
create unique index uq_one_active_booking_per_seat
  on bookings (seat_id)
  where booking_status in ('pending', 'confirmed');

-- ----------------------------------------------------------------------------
-- PAYMENTS  (simulated)
-- ----------------------------------------------------------------------------
create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  user_id uuid not null references profiles(id),
  amount numeric(10, 2) not null,
  payment_method text not null default 'simulated_card',
  payment_status payment_status not null default 'pending',
  transaction_reference text not null unique,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_payments_booking on payments (booking_id);

-- ----------------------------------------------------------------------------
-- BOOKING QUEUE  — the visible face of Sequential Processing
-- ----------------------------------------------------------------------------
create table booking_queue (
  id uuid primary key default gen_random_uuid(),
  request_number bigserial,
  user_id uuid not null references profiles(id),
  schedule_id uuid not null references schedules(id),
  seat_id uuid not null references seats(id),
  booking_id uuid references bookings(id),
  status queue_status not null default 'waiting',
  queued_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  result_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_queue_status on booking_queue (status, request_number);
create index idx_queue_schedule on booking_queue (schedule_id);

-- Guarantees only one row can ever be "processing" system-wide, which is the
-- database-level backstop for the "process one request at a time" rule.
create unique index uq_single_processing_slot
  on booking_queue ((true))
  where status = 'processing';

-- ----------------------------------------------------------------------------
-- PROCESSING LOGS  — proves the sequential order during the presentation
-- ----------------------------------------------------------------------------
create table processing_logs (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid not null references booking_queue(id) on delete cascade,
  request_number bigint not null,
  action text not null,
  message text,
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  processing_duration_ms int,
  created_at timestamptz not null default now()
);

create index idx_logs_queue on processing_logs (queue_id, created_at);
create index idx_logs_request on processing_logs (request_number);

-- ----------------------------------------------------------------------------
-- BOOKING CANCELLATIONS
-- ----------------------------------------------------------------------------
create table booking_cancellations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  cancelled_by uuid not null references profiles(id),
  reason text,
  cancelled_at timestamptz not null default now(),
  refund_amount numeric(10, 2),
  created_at timestamptz not null default now()
);

create index idx_cancellations_booking on booking_cancellations (booking_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();
create trigger trg_schedules_updated before update on schedules
  for each row execute function set_updated_at();
create trigger trg_bookings_updated before update on bookings
  for each row execute function set_updated_at();
create trigger trg_queue_updated before update on booking_queue
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- new-user -> profile bootstrap
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    new.raw_user_meta_data->>'phone',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
