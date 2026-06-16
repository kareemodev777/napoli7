-- Admin-editable marketing images (hero + home story + about). Components fall
-- back to the bundled /public defaults when a key is missing, so the site keeps
-- working before this table is seeded.

create table if not exists public.site_images (
  key        text primary key,
  url        text not null,
  alt        text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_images enable row level security;

-- Public read; writes happen through the service-role key (admin), which bypasses RLS.
drop policy if exists "site_images_public_read" on public.site_images;
create policy "site_images_public_read" on public.site_images
  for select using (true);

insert into public.site_images (key, url, alt) values
  ('home_hero', '/images/hero-pizza.jpg',
   'Hand-stretched Neapolitan pizza, fresh from a wood-fired oven'),
  ('home_family', '/images/home-family.jpg',
   'Sign in and get a free pizza — join the Napoli 7 family'),
  ('home_tradition', '/images/home-tradition.jpg',
   'Born of Neapolitan tradition — Caputo flour, San Marzano tomatoes, Neapolitan oven'),
  ('home_philosophy', '/images/home-philosophy.jpg',
   'Rooted in Naples, inspired by the world — the Napoli 7 philosophy'),
  ('about_cultures', '/images/about-cultures.png',
   'Where cultures meet — Napoli 7, rooted in Naples, inspired by the world')
on conflict (key) do nothing;
