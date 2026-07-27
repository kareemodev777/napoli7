-- Site-wide automatic menu discount (the "Grand Opening – 50% OFF" promotion).
-- A single-row config table: while enabled and inside its window, every order
-- gets `percent` off its ITEM SUBTOTAL automatically — no code, no login. It is
-- applied through the normal discount channel, so delivery and service fees are
-- never reduced. Admin-editable so the shop can start/extend/end it without a
-- deploy. Read by the storefront (to show sale prices) and the checkout guard.

create table if not exists public.menu_discount (
  id         smallint primary key default 1,
  enabled    boolean not null default false,
  percent    numeric(5,2) not null default 0,
  starts_at  timestamptz,
  ends_at    timestamptz,
  label      text not null default '',
  updated_at timestamptz not null default now(),
  constraint menu_discount_singleton check (id = 1)
);

alter table public.menu_discount enable row level security;

-- Public read; writes happen through the service-role key (admin), which bypasses RLS.
drop policy if exists "menu_discount_public_read" on public.menu_discount;
create policy "menu_discount_public_read" on public.menu_discount
  for select using (true);

-- Seed the Grand Opening sale: 50% off the entire menu, 28 Jul – 28 Aug 2026,
-- Asia/Dubai (+04). Enabled now so it activates on its own when the window opens.
insert into public.menu_discount (id, enabled, percent, starts_at, ends_at, label)
values (
  1,
  true,
  50,
  '2026-07-28 00:00:00+04',
  '2026-08-28 23:59:59+04',
  'Grand Opening – 50% OFF'
)
on conflict (id) do nothing;
