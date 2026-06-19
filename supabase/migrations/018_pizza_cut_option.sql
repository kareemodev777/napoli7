-- Allow customers to request their pizza be cut at checkout.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pizza_cut boolean NOT NULL DEFAULT false;
