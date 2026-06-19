-- Expand the payment_status enum so the Stripe webhook can record two outcomes
-- it previously had to collapse or ignore:
--   * partially_refunded — a Dashboard refund for less than the full charge
--                          (Bug 5: was being recorded as a full 'refunded').
--   * disputed           — a chargeback opened by the cardholder's bank
--                          (Bug 6: was silently ignored, money clawed back with
--                          no signal in the app).
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is idempotent and safe to re-run.

ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'partially_refunded';
ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'disputed';
