-- Phase 4 migration: account-linked features (addresses, wishlist, user roles).

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('admin', 'kitchen', 'customer'))
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_self_read" ON user_roles;
CREATE POLICY "user_roles_self_read" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS saved_addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label       text NOT NULL DEFAULT 'Home',
  street      text NOT NULL,
  area        text NOT NULL,
  flat        text,
  notes       text,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_addresses" ON saved_addresses;
CREATE POLICY "own_addresses" ON saved_addresses
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_wishlist" ON wishlists;
CREATE POLICY "own_wishlist" ON wishlists
  FOR ALL USING (auth.uid() = user_id);
