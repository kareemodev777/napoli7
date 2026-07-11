-- Correct the area list from 025.
--
-- 025 used the list the client sent with the GPS-zone change. Their Delivery-page
-- copy carries a different list: Al Jurf is split back into 1/2/3, the two Ajman
-- Free Zone entries appear, and eight areas that 025 added are absent. The client
-- confirmed this page list is the correct one, plus Al Yasmeen (a zone that has
-- been live since 008 and is missing from their copy only by oversight). 17 areas.
--
-- Still Ajman-only, still a flat 9 AED, and the area still decides nothing: the
-- GPS pin is what gates delivery (8 km radius AND inside Ajman). Every area below
-- was checked against that gate and passes.
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 025.

-- 025 collapsed 'Al Jurf 1' and 'Al Jurf 2' into 'Al Jurf'; that name is going
-- away again. Point those rows at 'Al Jurf 1' so no saved address is left holding
-- an area that matches no zone. The original 1-vs-2 split cannot be recovered, but
-- the pin is what actually routes the driver, and the customer can re-pick the
-- area. (saved_addresses was empty when 025 ran, so in practice this is a no-op.)
UPDATE saved_addresses SET area = 'Al Jurf 1' WHERE area = 'Al Jurf';

-- Retire everything, then re-activate exactly the list below. Anything 025 seeded
-- that is not re-listed stays behind as inactive rather than being deleted, so an
-- admin can flip it back on without a migration.
UPDATE delivery_zones SET active = false;

INSERT INTO delivery_zones (area, fee_aed, position, active) VALUES
  ('Al Jurf 1',                    9,  10, true),
  ('Al Jurf 2',                    9,  20, true),
  ('Al Jurf 3',                    9,  30, true),
  ('Al Nuaimiya',                  9,  40, true),
  ('Al Rashidiya',                 9,  50, true),
  ('Al Rumailah',                  9,  60, true),
  ('Ajman Corniche',               9,  70, true),
  ('Al Zahra',                     9,  80, true),
  ('Al Mowaihat',                  9,  90, true),
  ('Al Hamidiya',                  9, 100, true),
  ('Al Rawda',                     9, 110, true),
  ('Al Bustan',                    9, 120, true),
  ('Al Nakheel',                   9, 130, true),
  ('Al Raqaib',                    9, 140, true),
  ('Al Yasmeen',                   9, 150, true),
  ('Ajman Free Zone (Port)',       9, 160, true),
  ('Ajman Free Zone (Al Jurf)',    9, 170, true)
ON CONFLICT (area) DO UPDATE
  SET fee_aed  = EXCLUDED.fee_aed,
      position = EXCLUDED.position,
      active   = true;

-- Drop the short-lived 'Al Jurf' row 025 created. Named explicitly so this cannot
-- sweep away a zone an admin added by hand.
DELETE FROM delivery_zones WHERE area = 'Al Jurf';
