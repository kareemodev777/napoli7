-- Let admins mark a pizza as temporarily unavailable (sold out) without deactivating it.
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_temporarily_unavailable boolean NOT NULL DEFAULT false;
