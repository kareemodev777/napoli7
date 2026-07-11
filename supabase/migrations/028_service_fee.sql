-- A flat 3 AED service fee on every delivery order.
--
-- Pickup orders pay neither this nor the delivery fee. Unlike the 9 AED delivery
-- fee, the service fee is NOT waived by free delivery (orders of 80 AED or more) —
-- free delivery drops the 9, the 3 stays.
--
-- Stored as its own column rather than folded into delivery_fee_aed: the two are
-- waived by different rules, the POS pushes them as separate line items, and the
-- admin order screen has to show the customer what they were charged and why.
--
-- Existing orders default to 0, which is correct — they were never charged one.
--
-- Apply via: supabase db push  (or paste into SQL editor). Run after 027.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS service_fee_aed numeric(6,2) NOT NULL DEFAULT 0
    CHECK (service_fee_aed >= 0);
