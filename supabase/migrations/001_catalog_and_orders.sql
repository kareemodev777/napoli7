-- Phase 3 migration: catalog (read-only) + orders (write).
-- Apply via: supabase db push  (or paste into SQL editor)

-- Shared auth role table. Later migrations may add policies/features that
-- depend on this table, but order policies also reference it.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role    text NOT NULL CHECK (role IN ('admin', 'kitchen', 'customer'))
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_self_read" ON user_roles;
CREATE POLICY "user_roles_self_read" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- ---------- Catalog ----------

CREATE TABLE IF NOT EXISTS categories (
  id          text PRIMARY KEY,
  label       text NOT NULL,
  description text NOT NULL DEFAULT '',
  position    int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,
  category_id  text NOT NULL REFERENCES categories(id),
  name         text NOT NULL,
  name_it      text,
  description  text NOT NULL DEFAULT '',
  price_aed    numeric(8,2) NOT NULL,
  is_veg       boolean NOT NULL DEFAULT false,
  is_spicy     boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  position     int NOT NULL DEFAULT 0,
  image_url    text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS product_customizations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient   text NOT NULL,
  extra_price  numeric(6,2),
  removable    boolean NOT NULL DEFAULT true,
  position     int NOT NULL DEFAULT 0
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_customizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "customizations_public_read" ON product_customizations;
CREATE POLICY "customizations_public_read" ON product_customizations FOR SELECT USING (true);

-- ---------- Orders ----------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM (
      'received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_type') THEN
    CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('cod', 'card');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS orders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          text UNIQUE NOT NULL,
  user_id               uuid REFERENCES auth.users(id),
  customer_name         text NOT NULL,
  customer_phone        text NOT NULL,
  customer_email        text NOT NULL,
  delivery_type         delivery_type NOT NULL,
  delivery_address      jsonb,
  delivery_slot         text NOT NULL,
  order_notes           text,
  status                order_status NOT NULL DEFAULT 'received',
  payment_method        payment_method NOT NULL DEFAULT 'cod',
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  stripe_session_id     text,
  stripe_payment_intent text,
  subtotal_aed          numeric(8,2) NOT NULL,
  delivery_fee_aed      numeric(6,2) NOT NULL DEFAULT 0,
  total_aed             numeric(8,2) NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,
  product_name    text NOT NULL,
  base_price_aed  numeric(8,2) NOT NULL,
  quantity        int NOT NULL CHECK (quantity > 0),
  customizations  jsonb NOT NULL DEFAULT '[]',
  line_total_aed  numeric(8,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS trigger AS $$
BEGIN
  NEW.order_number := 'N7-' || LPAD(nextval('order_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number ON orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "track_guest_order" ON orders;
CREATE POLICY "track_guest_order" ON orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "own_order_insert" ON orders;
CREATE POLICY "own_order_insert" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "own_order_update_user" ON orders;
CREATE POLICY "own_order_update_user" ON orders
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "order_items_via_order" ON order_items;
CREATE POLICY "order_items_via_order" ON order_items FOR ALL USING (true);
