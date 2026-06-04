-- Phase 7 migration: promo restoration on cancellation.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 010.

-- Marks that a cancelled order's promo usage has already been credited back, so
-- the restore can never run twice (admin re-saving "cancelled", a retry, etc.).
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_restored boolean NOT NULL DEFAULT false;

-- Atomically credit back one promo redemption, flooring at zero so a code can
-- never go negative even if its counter was reset. Mirrors redeem_promo_code.
-- Returns the number of rows touched (1 = restored, 0 = unknown code).
CREATE OR REPLACE FUNCTION restore_promo_code(p_code text) RETURNS int AS $$
DECLARE
  affected int;
BEGIN
  UPDATE promo_codes
  SET times_used = GREATEST(times_used - 1, 0)
  WHERE code = p_code;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

-- One-shot, race-safe claim of the restore for an order. Flips promo_restored
-- false -> true and returns the order's promo_code ONLY on the first call; every
-- subsequent call matches no row and returns nothing. The caller decrements the
-- promo's counter only when a code is returned, guaranteeing exactly-once
-- restoration regardless of how many times an order is "cancelled".
CREATE OR REPLACE FUNCTION claim_promo_restore(p_order_id uuid) RETURNS text AS $$
DECLARE
  claimed_code text;
BEGIN
  UPDATE orders
  SET promo_restored = true
  WHERE id = p_order_id
    AND promo_restored = false
    AND promo_code IS NOT NULL
    -- Only orders whose promo was actually redeemed: COD redeems at placement,
    -- card only once the payment succeeded.
    AND (payment_method = 'cod' OR payment_status = 'paid')
  RETURNING promo_code INTO claimed_code;
  RETURN claimed_code;
END;
$$ LANGUAGE plpgsql;
