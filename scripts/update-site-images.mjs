// Point the live site_images rows at the refreshed marketing images.
// Run: node --env-file=.env.local scripts/update-site-images.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

const rows = [
  {
    key: "home_hero",
    url: "/images/hero-neapolitan-uae.jpg",
    alt: "Authentic Neapolitan pizza in the UAE — quality ingredients, true Italian taste",
  },
  {
    key: "home_family",
    url: "/images/home-family-v2.jpg",
    alt: "Sign in and get a free pizza — join the Napoli 7 family",
  },
  {
    key: "home_tradition",
    url: "/images/home-tradition-v2.jpg",
    alt: "From Naples, fired at 450°C — Caputo flour, San Marzano tomatoes, Neapolitan oven",
  },
  {
    key: "home_philosophy",
    url: "/images/home-philosophy-v2.jpg",
    alt: "Rooted in Naples, inspired by the world — the Napoli 7 philosophy",
  },
  {
    key: "about_cultures",
    url: "/images/about-cultures-v2.jpg",
    alt: "Where cultures meet — Napoli 7, rooted in Naples, inspired by the world",
  },
];

const sb = createClient(url, key, { auth: { persistSession: false } });
const { error } = await sb
  .from("site_images")
  .upsert(rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })));
if (error) {
  console.error("Update failed:", error.message);
  process.exit(1);
}
console.log(`Updated ${rows.length} site_images rows.`);
