-- ============================================================================
-- SEED DATA & MARITIME FERRY SCHEDULE RESET
-- Real-world Bohol Sea maritime corridors & fastcraft/RoRo liner capacities
-- Fastcraft capacity: 250 - 350 seats
-- RoRo Liner capacity: 350 - 550 seats
-- ============================================================================

-- 1. Clean up old dependent records to prevent conflicts
delete from processing_logs;
delete from booking_queue;
delete from payments;
delete from booking_cancellations;
delete from bookings;
delete from seats;
delete from schedules;

-- 2. Insert verified maritime schedules across primary Bohol corridors
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
  -- Tagbilaran Port ⇄ Cebu Pier 1 (OceanJet Fastcrafts)
  (
    '11111111-1111-1111-1111-111111111111',
    'Tagbilaran to Cebu',
    'Tagbilaran Port',
    'Cebu Pier 1',
    current_date,
    '06:00:00',
    '08:00:00',
    'OceanJet 88',
    'OJ-88',
    350,
    312,
    800.00,
    'scheduled'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Tagbilaran to Cebu',
    'Tagbilaran Port',
    'Cebu Pier 1',
    current_date,
    '08:20:00',
    '10:20:00',
    'OceanJet 168',
    'OJ-168',
    300,
    275,
    800.00,
    'scheduled'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Cebu to Tagbilaran',
    'Cebu Pier 1',
    'Tagbilaran Port',
    current_date,
    '09:20:00',
    '11:20:00',
    'OceanJet 288',
    'OJ-288',
    350,
    320,
    800.00,
    'scheduled'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Tagbilaran to Cebu',
    'Tagbilaran Port',
    'Cebu Pier 1',
    current_date,
    '13:00:00',
    '15:00:00',
    'OceanJet 88',
    'OJ-88',
    350,
    1,
    800.00,
    'scheduled'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Tagbilaran to Cebu',
    'Tagbilaran Port',
    'Cebu Pier 1',
    current_date,
    '17:25:00',
    '19:25:00',
    'SuperCat 32',
    'SC-32',
    280,
    240,
    825.00,
    'scheduled'
  ),

  -- Tubigon Port ⇄ Cebu (FastCat & Lite Ferries)
  (
    '66666666-6666-6666-6666-666666666666',
    'Tubigon to Cebu',
    'Tubigon Port',
    'Cebu Pier 1',
    current_date,
    '05:00:00',
    '06:45:00',
    'FastCat M11',
    'FC-11',
    275,
    250,
    360.00,
    'scheduled'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    'Tubigon to Cebu',
    'Tubigon Port',
    'Cebu Pier 1',
    current_date,
    '07:00:00',
    '09:00:00',
    'Lite Ferry 2',
    'LF-02',
    450,
    410,
    330.00,
    'scheduled'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'Cebu to Tubigon',
    'Cebu Pier 1',
    'Tubigon Port',
    current_date,
    '13:30:00',
    '15:15:00',
    'FastCat M11',
    'FC-11',
    275,
    260,
    360.00,
    'scheduled'
  ),

  -- Port of Getafe ⇄ Cordova RORO Port (Sunriser)
  (
    '99999999-9999-9999-9999-999999999999',
    'Getafe to Cordova',
    'Port of Getafe',
    'Cordova RORO Port',
    current_date,
    '08:00:00',
    '09:20:00',
    'LCT Sunriser 1',
    'SR-01',
    220,
    195,
    300.00,
    'scheduled'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Cordova to Getafe',
    'Cordova RORO Port',
    'Port of Getafe',
    current_date,
    '14:00:00',
    '15:20:00',
    'LCT Sunriser 1',
    'SR-01',
    220,
    205,
    300.00,
    'scheduled'
  ),

  -- Tagbilaran Port ⇄ Larena Port / Siquijor Pier
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Tagbilaran to Siquijor',
    'Tagbilaran Port',
    'Larena Port',
    current_date,
    '07:30:00',
    '09:15:00',
    'OceanJet 20',
    'OJ-20',
    260,
    230,
    650.00,
    'scheduled'
  ),

  -- Tagbilaran Port ⇄ Dumaguete Port
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Tagbilaran to Dumaguete',
    'Tagbilaran Port',
    'Dumaguete Port',
    current_date,
    '10:40:00',
    '12:40:00',
    'OceanJet 15',
    'OJ-15',
    320,
    290,
    1170.00,
    'scheduled'
  ),

  -- Jagna Port ⇄ Balbagon Port, Camiguin
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Jagna to Camiguin',
    'Jagna Port',
    'Balbagon Port',
    current_date,
    '14:30:00',
    '18:30:00',
    'Super Shuttle Ferry 12',
    'SS-12',
    320,
    285,
    600.00,
    'scheduled'
  ),

  -- Ubay Port ⇄ Bato Port, Leyte
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'Ubay to Bato',
    'Ubay Port',
    'Bato Port',
    current_date,
    '10:00:00',
    '12:45:00',
    'MV Medallion 8',
    'MD-08',
    320,
    295,
    420.00,
    'scheduled'
  ),

  -- Jagna Port ⇄ Cagayan de Oro Port (Light Ferries)
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'Jagna to Cagayan de Oro',
    'Jagna Port',
    'Cagayan de Oro Port',
    current_date,
    '22:00:00',
    '04:00:00',
    'Light Ferries 8',
    'LF-08',
    400,
    370,
    400.00,
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

-- 3. Populate recurring maritime crossings for the upcoming 7 days
insert into schedules (
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
select
  s.route_name,
  s.origin,
  s.destination,
  current_date + d as departure_date,
  s.departure_time,
  s.arrival_time,
  s.vehicle_name,
  s.vehicle_number,
  s.total_seats,
  s.available_seats,
  s.price,
  s.status
from schedules s
cross join generate_series(1, 6) as d
where s.departure_date = current_date;

-- 4. Populate sample initial seats for all scheduled voyages (Economy & Business Class tiers)
do $$
declare
  v_schedule record;
  v_row text;
  v_col int;
begin
  for v_schedule in select id, price, total_seats from schedules loop
    -- 4a. Economy Class Deck: Rows A to F (24 seats per voyage)
    foreach v_row in array array['A', 'B', 'C', 'D', 'E', 'F'] loop
      for v_col in 1..4 loop
        insert into seats (
          schedule_id,
          seat_number,
          seat_type,
          price,
          status
        )
        values (
          v_schedule.id,
          v_row || v_col,
          'economy',
          v_schedule.price,
          'available'
        )
        on conflict (schedule_id, seat_number) do nothing;
      end loop;
    end loop;

    -- 4b. Business Class VIP Deck: Rows J to L (12 seats per voyage)
    foreach v_row in array array['J', 'K', 'L'] loop
      for v_col in 1..4 loop
        insert into seats (
          schedule_id,
          seat_number,
          seat_type,
          price,
          status
        )
        values (
          v_schedule.id,
          v_row || v_col,
          'business',
          round(v_schedule.price * 1.45, 2),
          'available'
        )
        on conflict (schedule_id, seat_number) do nothing;
      end loop;
    end loop;
  end loop;
end $$;

-- 5. Demo Concurrency test scenario: leave A1 available for the last-seat concurrency test on voyage 44444444-...
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
