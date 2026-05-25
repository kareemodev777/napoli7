-- Allow admin-managed products to use larger size options.

ALTER TABLE product_sizes
  DROP CONSTRAINT IF EXISTS product_sizes_size_id_check;

ALTER TABLE product_sizes
  ADD CONSTRAINT product_sizes_size_id_check
  CHECK (size_id IN ('small', 'regular', 'large', 'family'));
