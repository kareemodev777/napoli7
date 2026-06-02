-- Phase 5 migration: per-area delivery fees.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 007.

CREATE TABLE IF NOT EXISTS delivery_zones (
  area       text PRIMARY KEY,
  fee_aed    numeric(6,2) NOT NULL CHECK (fee_aed >= 0),
  position   int NOT NULL DEFAULT 0,
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

-- Active zones are public (the checkout area picker reads them).
DROP POLICY IF EXISTS "delivery_zones_public_read" ON delivery_zones;
CREATE POLICY "delivery_zones_public_read" ON delivery_zones
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "delivery_zones_admin_all" ON delivery_zones;
CREATE POLICY "delivery_zones_admin_all" ON delivery_zones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ---------- Seed (Ajman areas; safe to edit) ----------

INSERT INTO delivery_zones (area, fee_aed, position) VALUES
  ('Al Jurf 1',       10, 10),
  ('Al Jurf 2',       10, 20),
  ('Al Nuaimiya',     12, 30),
  ('Al Rashidiya',    12, 40),
  ('Al Rumailah',     15, 50),
  ('Ajman Corniche',  15, 60),
  ('Al Zahra',        15, 70),
  ('Al Mowaihat',     18, 80),
  ('Al Hamidiya',     18, 90),
  ('Al Yasmeen',      20, 100)
ON CONFLICT (area) DO NOTHING;
