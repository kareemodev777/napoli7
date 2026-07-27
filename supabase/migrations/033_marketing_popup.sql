-- Admin-configurable marketing popup: a single-row config for a storefront modal
-- that opens (immediately or after a delay) with an image, a message, and a
-- call-to-action (a link, a copy-code button, or a redeem-to-cart button). Public
-- read; writes go through the service-role key (admin), which bypasses RLS.

create table if not exists public.marketing_popup (
  id            smallint primary key default 1,
  enabled       boolean not null default false,
  image_url     text not null default '',
  title         text not null default '',
  body          text not null default '',
  cta_type      text not null default 'none',
  cta_label     text not null default '',
  cta_href      text not null default '',
  cta_code      text not null default '',
  delay_seconds integer not null default 0,
  updated_at    timestamptz not null default now(),
  constraint marketing_popup_singleton check (id = 1),
  constraint marketing_popup_cta_type
    check (cta_type in ('none', 'link', 'copy', 'redeem'))
);

alter table public.marketing_popup enable row level security;

drop policy if exists "marketing_popup_public_read" on public.marketing_popup;
create policy "marketing_popup_public_read" on public.marketing_popup
  for select using (true);

-- Seed the Grand Opening announcement: the flyer image + an "Order now" link.
insert into public.marketing_popup
  (id, enabled, image_url, title, body, cta_type, cta_label, cta_href, cta_code, delay_seconds)
values (
  1,
  true,
  '/images/grand-opening.webp',
  'Grand Opening — 50% OFF the entire menu',
  'From 28 July to 28 August, every item is half price. No account, no code — order as a guest and the 50% is applied automatically at checkout.',
  'link',
  'Order now',
  '/menu',
  '',
  2
)
on conflict (id) do nothing;
