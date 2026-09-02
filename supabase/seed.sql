-- ============================================================================
-- SEED DATA
--
-- NOTE ON TEST USERS:
-- Supabase Auth users cannot be created via plain SQL insert into auth.users
-- in a portable way across CLI/hosted setups. Create the test accounts
-- through Supabase Auth first (see README "Seeding test users"), then run
-- this file, which fills in schedules/seats and expects a mapping between
-- emails and the profiles the `handle_new_user` trigger already created.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SCHEDULES
-- ----------------------------------------------------------------------------
insert into schedules (id, route_name, origin, destination, departure_date, departure_time, arrival_time, vehicle_name, vehicle_number, total_seats, available_seats, price, status)
values
  ('11111111-1111-1111-1111-111111111111', 'Tagbilaran → Balilihan', 'Tagbilaran', 'Balilihan', current_date + 9, '08:00', '09:00', 'Bohol Express Van', 'BHL-1021', 12, 12, 150.00, 'scheduled'),
  ('22222222-2222-2222-2222-222222222222', 'Tagbilaran → Carmen', 'Tagbilaran', 'Carmen', current_date + 9, '10:30', '12:00', 'Bohol Express Van', 'BHL-1044', 12, 12, 220.00, 'scheduled'),
  ('33333333-3333-3333-3333-333333333333', 'Balilihan → Tagbilaran', 'Balilihan', 'Tagbilaran', current_date + 10, '15:00', '16:00', 'Bohol Express Van', 'BHL-1021', 12, 12, 150.00, 'scheduled'),
  -- Dedicated schedule for the "five customers, last seat" demo
  ('44444444-4444-4444-4444-444444444444', 'Tagbilaran → Loboc (DEMO)', 'Tagbilaran', 'Loboc', current_date + 9, '13:00', '14:00', 'Demo Shuttle', 'DEMO-0001', 12, 1, 250.00, 'scheduled')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- SEATS  — 3 rows x 4 columns per schedule
-- ----------------------------------------------------------------------------
do $$
declare
  v_schedule record;
  v_row text;
  v_col int;
begin
  for v_schedule in select id, price from schedules loop
    foreach v_row in array array['A','B','C'] loop
      for v_col in 1..4 loop
        insert into seats (schedule_id, seat_number, seat_type, price, status)
        values (v_schedule.id, v_row || v_col, case when v_row = 'A' then 'premium' else 'standard' end, v_schedule.price, 'available')
        on conflict (schedule_id, seat_number) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- DEMO SCENARIO: exactly ONE available seat on the demo schedule.
-- Mark 11 of 12 seats as already booked, leaving seat A1 free — this is the
-- seat the "Run 5-Customer Last Seat Test" targets.
-- ----------------------------------------------------------------------------
update seats
set status = 'booked'
where schedule_id = '44444444-4444-4444-4444-444444444444'
  and seat_number <> 'A1';

update seats
set status = 'available'
where schedule_id = '44444444-4444-4444-4444-444444444444'
  and seat_number = 'A1';

update schedules
set available_seats = 1
where id = '44444444-4444-4444-4444-444444444444';

-- ----------------------------------------------------------------------------
-- Promote a specific profile to admin (run after creating the admin auth user)
-- Example:
--   update profiles set role = 'admin' where email = 'admin@ticketbooking.test';
-- ----------------------------------------------------------------------------
