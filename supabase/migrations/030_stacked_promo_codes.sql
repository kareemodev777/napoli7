-- An order may carry several promo codes.
--
-- Three friends each earn a free-Margherita code and pool them on one order, paid
-- for from a single account. Each takes 19 AED off. `promo_code` holds one code
-- and cannot say that, so add the list.
--
-- `promo_code` stays, holding the first code, so every existing reader — the POS
-- payload, the admin screens, the order history — keeps working untouched and
-- historical orders keep their meaning. `promo_codes` is the truth for redemption
-- and for restoring codes when an order is cancelled.
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 029.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS promo_codes text[] NOT NULL DEFAULT '{}';

-- Backfill: an existing order's single code is a one-element list.
UPDATE orders
   SET promo_codes = ARRAY[promo_code]
 WHERE promo_code IS NOT NULL
   AND cardinality(promo_codes) = 0;
