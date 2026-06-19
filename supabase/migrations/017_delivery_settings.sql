-- Delivery settings used by checkout and the admin panel.
create table if not exists public.delivery_settings (
  key text primary key,
  value numeric(10,2) not null,
  updated_at timestamptz not null default now()
);

insert into public.delivery_settings (key, value)
values ('delivery_min_subtotal_aed', 28)
on conflict (key) do update
set value = excluded.value,
    updated_at = now();

alter table public.delivery_settings enable row level security;

-- Public read-only access so checkout can display the live minimum order value.
create policy "Public can read delivery settings"
  on public.delivery_settings
  for select
  using (true);
