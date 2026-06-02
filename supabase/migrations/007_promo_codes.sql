-- Phase 5 migration: promo codes.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 006.

-- ---------- Promo codes ----------

CREATE TABLE IF NOT EXISTS promo_codes (
  code             text PRIMARY KEY,
  discount_aed     numeric(8,2),
  discount_pct     numeric(5,2),
  min_subtotal_aed numeric(8,2) NOT NULL DEFAULT 0,
  valid_from       timestamptz,
  valid_until      timestamptz,
  max_uses         int,
  times_used       int NOT NULL DEFAULT 0,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- Exactly one of the two discount kinds must be set.
  CONSTRAINT promo_one_discount_kind CHECK (
    (discount_aed IS NOT NULL)::int + (discount_pct IS NOT NULL)::int = 1
  ),
  CONSTRAINT promo_pct_range CHECK (discount_pct IS NULL OR (discount_pct > 0 AND discount_pct <= 100)),
  CONSTRAINT promo_aed_positive CHECK (discount_aed IS NULL OR discount_aed > 0)
);

-- Codes are validated server-side via the service role; no public read.
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_codes_admin_all" ON promo_codes;
CREATE POLICY "promo_codes_admin_all" ON promo_codes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Atomic, race-safe redemption: increments only if the code is still
-- redeemable. Returns the number of rows touched (1 = success, 0 = exhausted).
CREATE OR REPLACE FUNCTION redeem_promo_code(p_code text) RETURNS int AS $$
DECLARE
  affected int;
BEGIN
  UPDATE promo_codes
  SET times_used = times_used + 1
  WHERE code = p_code
    AND active = true
    AND (max_uses IS NULL OR times_used < max_uses)
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now());
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- ---------- Order discount columns ----------

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code   text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_aed numeric(8,2) NOT NULL DEFAULT 0;

-- ---------- Seed (demo codes; safe to edit/remove) ----------

INSERT INTO promo_codes (code, discount_pct, discount_aed, min_subtotal_aed, active)
VALUES
  ('WELCOME10', 10, NULL, 0,  true),
  ('NAPOLI20',  NULL, 20,  80, true)
ON CONFLICT (code) DO NOTHING;
