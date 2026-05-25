-- Product sizes for admin-managed catalog pricing.

CREATE TABLE IF NOT EXISTS product_sizes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  size_id     text NOT NULL CHECK (size_id IN ('small', 'regular')),
  label       text NOT NULL,
  detail      text NOT NULL DEFAULT '',
  price_aed   numeric(8,2) NOT NULL,
  position    int NOT NULL DEFAULT 0,
  UNIQUE (product_id, size_id)
);

ALTER TABLE product_sizes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "product_sizes_public_read" ON product_sizes;
CREATE POLICY "product_sizes_public_read" ON product_sizes
  FOR SELECT USING (true);
