import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface SiteImage {
  url: string;
  alt: string;
}

export const SITE_IMAGE_KEYS = [
  "home_hero",
  "home_family",
  "home_tradition",
  "home_philosophy",
  "about_cultures",
  "about_story",
] as const;

export type SiteImageKey = (typeof SITE_IMAGE_KEYS)[number];

export type SiteImageMap = Record<SiteImageKey, SiteImage>;

/** Bundled defaults — used until an admin replaces an image (and as a fallback). */
export const SITE_IMAGE_DEFAULTS: SiteImageMap = {
  home_hero: {
    url: "/images/hero-neapolitan-uae.jpg",
    alt: "Authentic Neapolitan pizza in the UAE — quality ingredients, true Italian taste",
  },
  home_family: {
    url: "/images/home-family-v2.jpg",
    alt: "Sign in and get a free pizza — the Napoli 7 deal",
  },
  home_tradition: {
    url: "/images/home-tradition-v2.jpg",
    alt: "From Naples, fired at 450°C — Caputo flour, San Marzano tomatoes, Neapolitan oven",
  },
  home_philosophy: {
    url: "/images/home-philosophy-v2.jpg",
    alt: "Rooted in Naples, inspired by the world — the Napoli 7 philosophy",
  },
  about_cultures: {
    url: "/images/about-cultures-v2.jpg",
    alt: "Where cultures meet — Napoli 7, rooted in Naples, inspired by the world",
  },
  about_story: {
    url: "/images/home-philosophy-v2.jpg",
    alt: "From Naples to the Emirates — the Napoli 7 story",
  },
};

/** Hard upload limit (server-enforced). Files are compressed client-side well
 *  below this; it's the backstop for the rare case compression is skipped. */
export const SITE_IMAGE_MAX_MB = 5;

/** Target longest edge after client-side resize, for fast-loading pages. */
export const SITE_IMAGE_MAX_WIDTH = 1920;

/** Admin-facing labels/descriptions for each editable image. */
export const SITE_IMAGE_FIELDS: Array<{
  key: SiteImageKey;
  label: string;
  description: string;
  aspect: string;
  /** Recommended pixel dimensions shown as an admin hint. */
  recommended: string;
}> = [
  {
    key: "home_hero",
    label: "Home hero",
    description: "Large banner at the top of the home page.",
    aspect: "16 / 9",
    recommended: "1920 × 1080 px",
  },
  {
    key: "home_family",
    label: 'Home — Deal',
    description: "Image beside the free-pizza / sign-up section.",
    aspect: "16 / 9",
    recommended: "1280 × 720 px",
  },
  {
    key: "home_tradition",
    label: "Home — Neapolitan tradition",
    description: "Image beside the ingredients / oven section.",
    aspect: "16 / 9",
    recommended: "1280 × 720 px",
  },
  {
    key: "home_philosophy",
    label: "Home — Our philosophy",
    description: "Image beside the philosophy section.",
    aspect: "16 / 9",
    recommended: "1280 × 720 px",
  },
  {
    key: "about_cultures",
    label: "About — Where cultures meet",
    description: "Banner on the About page.",
    aspect: "3 / 2",
    recommended: "1500 × 1000 px",
  },
  {
    key: "about_story",
    label: "About — Our Story",
    description: "Image beside the Our Story section on the About page.",
    aspect: "3 / 2",
    recommended: "1500 × 1000 px",
  },
];

function isSiteImageKey(value: string): value is SiteImageKey {
  return (SITE_IMAGE_KEYS as readonly string[]).includes(value);
}

/**
 * Resolve every site image, overlaying admin-saved rows on top of the bundled
 * defaults. Never throws — falls back to defaults when Supabase is absent or the
 * read fails, so public pages always render.
 */
export async function getSiteImages(): Promise<SiteImageMap> {
  const resolved: SiteImageMap = { ...SITE_IMAGE_DEFAULTS };
  if (!HAS_SUPABASE_SERVICE) return resolved;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("site_images")
      .select("key, url, alt");
    if (error || !data) return resolved;

    for (const row of data as Array<{ key: string; url: string; alt: string }>) {
      if (!isSiteImageKey(row.key)) continue;
      resolved[row.key] = {
        url: row.url?.trim() || resolved[row.key].url,
        alt: row.alt?.trim() || resolved[row.key].alt,
      };
    }
    return resolved;
  } catch {
    return resolved;
  }
}
