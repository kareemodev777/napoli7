-- Phase 6 migration: editable orders + audit trail.
-- Apply via: supabase db push  (or paste into SQL editor). Run after 008.

-- Free-text operational note an admin can attach to an order (e.g. how a
-- payment difference was settled). Distinct from customer-facing order_notes.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS admin_notes text;

-- Append-only audit log of admin edits. One row per saved edit, capturing the
-- before/after totals and how any payment difference was handled. Never
-- mutated, so it preserves the full history even as the order changes.
CREATE TABLE IF NOT EXISTS order_edits (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  edited_by           uuid REFERENCES auth.users(id),
  old_total_aed       numeric(8,2) NOT NULL,
  new_total_aed       numeric(8,2) NOT NULL,
  difference_aed      numeric(8,2) NOT NULL,
  -- How the difference was settled: cash_collected | cash_refunded |
  -- card_manual | none. Free text, validated in the server action.
  payment_handling    text NOT NULL DEFAULT 'none',
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_edits_order_id_idx
  ON order_edits (order_id, created_at DESC);

ALTER TABLE order_edits ENABLE ROW LEVEL SECURITY;

-- Admins only. Writes happen through the service role (which bypasses RLS),
-- but this policy lets an authenticated admin read the history directly too.
DROP POLICY IF EXISTS "order_edits_admin_all" ON order_edits;
CREATE POLICY "order_edits_admin_all" ON order_edits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
