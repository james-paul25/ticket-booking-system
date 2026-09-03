-- ============================================================================
-- SEED DATA & TRIP RESET
-- Van capacity: 15 seats (A1..A15)
-- Ceres & Shuttle capacity: 45 seats (A1..A45)
-- ============================================================================

-- 1. Clean up old dependent records to prevent conflicts
delete from processing_logs;
delete from booking_queue;
delete from payments;
delete from booking_cancellations;
delete from bookings;
delete from seats;
delete from schedules;

-- 2. Insert schedules with exact codes, routes, and specified capacities
insert into schedules (
  id,
  route_name,
  origin,
  destination,
  departure_date,
  departure_time,
  arrival_time,
  vehicle_name,
  vehicle_number,
  total_seats,
  available_seats,
  price,
  status
)
values
  -- Van Trips: 15 seats
  (
    '11111111-1111-1111-1111-111111111111',
    'Tagbilaran → Balilihan',
    'Tagbilaran',
    'Balilihan',
    current_date + 9,
    '08:00',
    '09:00',
    'Bohol Express Van',
    'BHL-1021',
    15,
    15,
    150.00,
    'scheduled'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Tagbilaran → Carmen',
    'Tagbilaran',
    'Carmen',
    current_date + 9,
    '10:30',
    '12:00',
    'Bohol Express Van',
    'BHL-1044',
    15,
    15,
    220.00,
    'scheduled'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Balilihan → Tagbilaran',
    'Balilihan',
    'Tagbilaran',
    current_date + 10,
    '15:00',
    '16:00',
    'Bohol Express Van',
    'BHL-1021',
    15,
    15,
    150.00,
    'scheduled'
  ),
  -- Bus Trips (Ceres & Shuttle): 45 seats
  (
    '44444444-4444-4444-4444-444444444444',
    'Tagbilaran → Loboc (DEMO)',
    'Tagbilaran',
    'Loboc',
    current_date + 9,
    '13:00',
    '14:00',
    'Demo Shuttle',
    'DEMO-0001',
    45,
    1,
    250.00,
    'scheduled'
  ),
  (
    '494a1095-6774-4fad-b6db-5c83e030e881',
    'Tagbilaran → Tubigon',
    'Tagbilaran',
    'Tubigon',
    current_date + 9,
    '20:00',
    '21:00',
    'Ceres Bus',
    'CERES-1234',
    45,
    45,
    85.00,
    'scheduled'
  )
on conflict (id) do update set
  route_name = excluded.route_name,
  origin = excluded.origin,
  destination = excluded.destination,
  departure_date = excluded.departure_date,
  departure_time = excluded.departure_time,
  arrival_time = excluded.arrival_time,
  vehicle_name = excluded.vehicle_name,
  vehicle_number = excluded.vehicle_number,
  total_seats = excluded.total_seats,
  available_seats = excluded.available_seats,
  price = excluded.price,
  status = excluded.status;

-- 3. Populate seats: 15 for Vans, 45 for Ceres & Shuttle
do $$
declare
  v_schedule record;
  v_seat_num int;
begin
  for v_schedule in select id, price, total_seats from schedules loop
    for v_seat_num in 1..v_schedule.total_seats loop
      insert into seats (
        schedule_id,
        seat_number,
        seat_type,
        price,
        status
      )
      values (
        v_schedule.id,
        'A' || v_seat_num,
        case when v_seat_num <= 4 then 'premium' else 'standard' end,
        v_schedule.price,
        'available'
      )
      on conflict (schedule_id, seat_number) do nothing;
    end loop;
  end loop;
end $$;

-- 4. Demo Shuttle scenario: leave A1 available for the last-seat concurrency test
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
