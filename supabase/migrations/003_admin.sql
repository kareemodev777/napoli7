-- Phase 5 migration: promo codes, delivery zones.

CREATE TABLE IF NOT EXISTS promo_codes (
  code             text PRIMARY KEY,
  discount_type    text NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value   numeric(6,2) NOT NULL,
  min_order_aed    numeric(6,2) NOT NULL DEFAULT 0,
  max_uses         int,
  uses_count       int NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_zones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name      text NOT NULL,
  fee_aed        numeric(6,2) NOT NULL,
  min_order_aed  numeric(6,2) NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true
);

INSERT INTO delivery_zones (area_name, fee_aed, min_order_aed) VALUES
  ('Al Jurf 1', 5.00, 20.00),
  ('Al Jurf 2', 5.00, 20.00),
  ('Al Jurf 3', 5.00, 20.00),
  ('Ajman City Centre', 10.00, 25.00),
  ('Al Rashidiya', 10.00, 25.00)
ON CONFLICT DO NOTHING;

INSERT INTO promo_codes (code, discount_type, discount_value, min_order_aed, max_uses)
VALUES ('WELCOME', 'flat', 29.00, 0.00, NULL)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_admin_manage" ON promo_codes;
CREATE POLICY "promo_codes_admin_manage" ON promo_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "delivery_zones_public_read" ON delivery_zones;
CREATE POLICY "delivery_zones_public_read" ON delivery_zones
  FOR SELECT USING (is_active = true);
