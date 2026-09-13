-- Migration 0004: Explicit Economy and Business Class seat types
-- Updates default seat_type to 'economy' and normalizes legacy naming

alter table seats 
  alter column seat_type set default 'economy';

-- Normalize any historical standard/tourist/premium values
update seats set seat_type = 'economy' where seat_type in ('standard', 'tourist', 'economy');
update seats set seat_type = 'business' where seat_type in ('premium', 'first', 'vip', 'business');
