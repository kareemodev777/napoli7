-- Restore the 20-area list, reverting 026.
--
-- 026 followed the area list printed in the client's Delivery-page copy. The
-- client has since confirmed that list was the mistaken one: the list they sent
-- with the GPS-zone change is authoritative, and the page copy is to be corrected
-- to match it (not the reverse). So: Al Jurf is a single area again, the two Ajman
-- Free Zone entries go, and Al Tallah / Al Helio / Al Zahya / Al Alia / Ajman
-- Industrial Area / Emirates City / Al Zorah come back.
--
-- Still Ajman-only, still a flat 9 AED. The area remains a convenience field —
-- the GPS pin is what gates delivery (8 km radius AND inside Ajman). Note that
-- listing an area here does NOT promise every address in it is deliverable: Al
-- Helio's centre is ~9.8 km out, so most Al Helio pins are refused by the radius.
-- That is the client's intent ("the area is only for convenience; validation must
-- always be based on the GPS pin").
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 026.

-- 026 split 'Al Jurf' back into 'Al Jurf 1'/'Al Jurf 2'/'Al Jurf 3'; those names
-- are going away again. Point any saved address at the single 'Al Jurf' so none is
-- left holding an area that matches no zone. (saved_addresses is empty, so in
-- practice this is a no-op — it exists so the migration is safe on a populated DB.)
UPDATE saved_addresses SET area = 'Al Jurf'
  WHERE area IN ('Al Jurf 1', 'Al Jurf 2', 'Al Jurf 3');
UPDATE saved_addresses SET area = 'Al Jurf'
  WHERE area IN ('Ajman Free Zone (Port)', 'Ajman Free Zone (Al Jurf)');

-- Retire everything, then re-activate exactly the list below. Anything not
-- re-listed stays behind as inactive rather than deleted, so an admin can flip it
-- back on without a migration.
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
  ('Ajman Industrial Area', 9, 180, true),
  ('Emirates City',         9, 190, true),
  ('Al Zorah',              9, 200, true)
ON CONFLICT (area) DO UPDATE
  SET fee_aed  = EXCLUDED.fee_aed,
      position = EXCLUDED.position,
      active   = true;

-- Drop the short-lived rows 026 created. Named explicitly so this cannot sweep
-- away a zone an admin added by hand.
DELETE FROM delivery_zones
  WHERE area IN ('Al Jurf 1', 'Al Jurf 2', 'Al Jurf 3',
                 'Ajman Free Zone (Port)', 'Ajman Free Zone (Al Jurf)');
