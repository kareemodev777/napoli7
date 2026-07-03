-- Phase: new-order alarm. Durable acknowledgment for the admin ringing alarm.
-- Apply via: supabase db push (or paste into the SQL editor). Run after 023.
--
-- Previously "I've seen the new orders" lived only in client memory, so a page
-- reload (or a second device) reset it and the alarm rang again for orders the
-- kitchen had already acknowledged. Stamping acknowledged_at on the order makes
-- the acknowledgment durable: the alarm rings only for actionable orders that
-- are still unacknowledged. Additive + nullable; existing rows read as NULL
-- (unacknowledged) which is the safe default.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
