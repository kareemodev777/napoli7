-- How many promo codes one order may stack. Several friends at the same address
-- pool their free-pizza codes onto a single basket (one delivery, one fee), so the
-- shop needs to cap how many codes a group can combine — and to change that cap
-- without a deploy. Stored in the generic delivery_settings key/value table that
-- already backs the delivery minimum; read by the cart, checkout, and the server
-- order guard.
insert into public.delivery_settings (key, value)
values ('max_promo_codes_per_order', 8)
on conflict (key) do nothing;
