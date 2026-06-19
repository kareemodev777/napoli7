-- Temporary delivery minimum override.
-- Keep checkout aligned with the 13 AED floor until the admin edit flow is fixed.
insert into public.delivery_settings (key, value)
values ('delivery_min_subtotal_aed', 13)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
