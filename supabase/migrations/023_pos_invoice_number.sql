-- Phase: POS invoice capture. Store the invoice/voucher number the POS (xtbooks)
-- assigns to each order (e.g. 'INV-46') so the admin can read it straight from the
-- orders table instead of opening the POS. Additive + idempotent.
-- Apply via: supabase db push (or paste into the SQL editor). Run after 022.
--
-- This also reconciles pos_sync_status / pos_synced_at: the app already reads and
-- writes those columns, but they were applied out-of-band and never captured in a
-- tracked migration. Adding them here IF NOT EXISTS means a fresh `db push`
-- reproduces the full schema the POS pusher expects.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_sync_status    text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_synced_at      timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pos_invoice_number text;

-- Keep the raw POS response body per push attempt so a missing or mis-keyed
-- invoice number can be diagnosed and back-filled from the log.
ALTER TABLE pos_push_log ADD COLUMN IF NOT EXISTS response text;
