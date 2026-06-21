-- Phase: delivery riders. A roster of drivers the admin can register and assign
-- to delivery orders. Riders are identified by their WhatsApp number (no login
-- account is required) so assignment can fire an order brief over WhatsApp.

CREATE TABLE IF NOT EXISTS riders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  phone       text NOT NULL,
  vehicle     text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE riders ENABLE ROW LEVEL SECURITY;

-- Only admins manage riders (mirrors promo_codes_admin_manage). The service-role
-- client used by the admin pages bypasses RLS, but this keeps the authed admin
-- client working too and blocks everyone else.
DROP POLICY IF EXISTS "riders_admin_manage" ON riders;
CREATE POLICY "riders_admin_manage" ON riders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Link an order to the rider delivering it. Nullable (pickup/unassigned orders),
-- and SET NULL on rider delete so removing a driver never deletes order history.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS assigned_rider_id uuid REFERENCES riders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS orders_assigned_rider_id_idx
  ON orders (assigned_rider_id);
