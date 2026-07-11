-- Delivery is Ajman-only. Replace the 10 seeded areas from 008 with the full
-- list of Ajman areas, at the flat 9 AED fee.
--
-- The area is a convenience field: it rides along to the driver and it is NOT
-- what decides whether an order can be delivered. That decision is made from the
-- GPS pin, which must fall inside BOTH the 8 km radius and the Ajman emirate
-- boundary (see src/lib/delivery-map.ts + src/lib/ajman-boundary.ts). Sharjah is
-- excluded no matter how close it is to the shop.
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 024.

-- 008 seeded "Al Jurf 1" and "Al Jurf 2"; the two are now a single "Al Jurf".
-- delivery_zones.area is referenced by no foreign key, but saved_addresses.area
-- stores it as free text, so re-point those rows before the old names disappear
-- or the owning customers would silently fall out of every delivery zone.
UPDATE saved_addresses SET area = 'Al Jurf'
  WHERE area IN ('Al Jurf 1', 'Al Jurf 2');

-- Retire any area that is not in the list below (this drops the old Al Jurf 1 /
-- Al Jurf 2 rows). Deactivating rather than deleting keeps historical orders
-- readable and lets an admin flip one back on from the admin panel.
UPDATE delivery_zones SET active = false;

INSERT INTO delivery_zones (area, fee_aed, position, active) VALUES
  ('Al Jurf',               9,  10, true),
  ('Al Nuaimiya',           9,  20, true),
  ('Al Rashidiya',          9,  30, true),
  ('Al Rumailah',           9,  40, true),
  ('Al Nakheel',            9,  50, true),
  ('Al Bustan',             9,  60, true),
  ('Ajman Corniche',        9,  70, true),
  ('Al Zahra',              9,  80, true),
  ('Al Hamidiya',           9,  90, true),
  ('Al Rawda',              9, 100, true),
  ('Al Mowaihat',           9, 110, true),
  ('Al Tallah',             9, 120, true),
  ('Al Yasmeen',            9, 130, true),
  ('Al Helio',              9, 140, true),
  ('Al Zahya',              9, 150, true),
  ('Al Alia',               9, 160, true),
  ('Al Raqaib',             9, 170, true),
  ('Ajman Industrial Area',9, 180, true),
  ('Emirates City',         9, 190, true),
  ('Al Zorah',              9, 200, true)
ON CONFLICT (area) DO UPDATE
  SET fee_aed  = EXCLUDED.fee_aed,
      position = EXCLUDED.position,
      active   = true;

-- Drop the now-inactive leftovers from the 008 seed. Named explicitly so this
-- cannot sweep away a zone an admin added by hand.
DELETE FROM delivery_zones WHERE area IN ('Al Jurf 1', 'Al Jurf 2');
