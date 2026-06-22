-- Phase: "free pizza for the first N registrants" signup campaign.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 021.
--
-- How it works:
--   * Admin configures a single campaign row (reward pizza, max claims, on/off)
--     from /admin/promos.
--   * When a NEW user registers, `claim_free_pizza` atomically issues them a
--     unique, single-use promo code worth the chosen pizza's price — but only
--     while the campaign is active and under the cap.
--   * Each claim is bound to BOTH the normalized email AND the normalized phone
--     (each UNIQUE), so a person cannot re-claim by changing only one of them.

-- ---------- Mark auto-issued codes so the admin promo list can hide them ----------

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false;

-- ---------- Campaign config (single row) ----------

CREATE TABLE IF NOT EXISTS signup_campaign (
  id                int PRIMARY KEY DEFAULT 1,
  active            boolean NOT NULL DEFAULT false,
  max_claims        int NOT NULL DEFAULT 1000,
  claims_count      int NOT NULL DEFAULT 0,
  reward_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  code_prefix       text NOT NULL DEFAULT 'FREEPIZZA',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT signup_campaign_singleton CHECK (id = 1),
  CONSTRAINT signup_campaign_max_positive CHECK (max_claims > 0)
);

INSERT INTO signup_campaign (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ---------- Per-claim identity binding ----------

CREATE TABLE IF NOT EXISTS free_pizza_claims (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email_norm   text NOT NULL,
  phone_norm   text NOT NULL,
  code         text NOT NULL REFERENCES promo_codes(code) ON DELETE CASCADE,
  claim_number int NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Either field already used => no second reward. Defeating this needs a
  -- genuinely new email AND a new phone number.
  CONSTRAINT free_pizza_email_unique UNIQUE (email_norm),
  CONSTRAINT free_pizza_phone_unique UNIQUE (phone_norm)
);

ALTER TABLE signup_campaign ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_pizza_claims ENABLE ROW LEVEL SECURITY;

-- Direct table access is admin-only; the claim itself runs through a
-- SECURITY DEFINER RPC invoked with the service role.
DROP POLICY IF EXISTS "signup_campaign_admin" ON signup_campaign;
CREATE POLICY "signup_campaign_admin" ON signup_campaign
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "free_pizza_claims_admin" ON free_pizza_claims;
CREATE POLICY "free_pizza_claims_admin" ON free_pizza_claims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- ---------- Atomic claim ----------
-- Returns one row (the issued reward) on success, or NO rows when the campaign
-- is off / capped / misconfigured, or the email or phone has already claimed.
-- The campaign row is locked FOR UPDATE so the cap can never be exceeded under
-- concurrent signups.
CREATE OR REPLACE FUNCTION claim_free_pizza(
  p_user_id uuid,
  p_email   text,
  p_phone   text
)
RETURNS TABLE (code text, claim_number int, discount_aed numeric, reward_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign   signup_campaign%ROWTYPE;
  v_email_norm text := lower(btrim(coalesce(p_email, '')));
  v_phone_norm text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_price      numeric(8,2);
  v_name       text;
  v_code       text;
  v_number     int;
BEGIN
  IF v_email_norm = '' OR v_phone_norm = '' THEN
    RETURN;
  END IF;

  SELECT * INTO v_campaign FROM signup_campaign WHERE id = 1 FOR UPDATE;

  IF NOT FOUND OR NOT v_campaign.active THEN
    RETURN;                                   -- campaign off
  END IF;
  IF v_campaign.claims_count >= v_campaign.max_claims THEN
    RETURN;                                   -- cap reached
  END IF;
  IF v_campaign.reward_product_id IS NULL THEN
    RETURN;                                   -- no reward pizza chosen
  END IF;

  SELECT price_aed, name INTO v_price, v_name
  FROM products WHERE id = v_campaign.reward_product_id;
  IF v_price IS NULL OR v_price <= 0 THEN
    RETURN;                                   -- misconfigured reward
  END IF;

  -- Already claimed by this email or phone?
  IF EXISTS (
    SELECT 1 FROM free_pizza_claims
    WHERE email_norm = v_email_norm OR phone_norm = v_phone_norm
  ) THEN
    RETURN;
  END IF;

  v_number := v_campaign.claims_count + 1;

  -- Issue a unique single-use code worth one pizza. The min subtotal equals the
  -- pizza price so the discount only applies once there's a pizza's worth in the
  -- cart, and the discount is clamped to the subtotal at checkout.
  LOOP
    v_code := v_campaign.code_prefix || '-' ||
              upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM promo_codes pc WHERE pc.code = v_code);
  END LOOP;

  INSERT INTO promo_codes
    (code, discount_aed, min_subtotal_aed, max_uses, active, auto_generated)
  VALUES
    (v_code, v_price, v_price, 1, true, true);

  INSERT INTO free_pizza_claims (user_id, email_norm, phone_norm, code, claim_number)
  VALUES (p_user_id, v_email_norm, v_phone_norm, v_code, v_number);

  UPDATE signup_campaign
  SET claims_count = claims_count + 1, updated_at = now()
  WHERE id = 1;

  RETURN QUERY SELECT v_code, v_number, v_price, v_name;
EXCEPTION
  WHEN unique_violation THEN
    -- A concurrent signup grabbed the same email/phone first. No reward.
    RETURN;
END;
$$;
