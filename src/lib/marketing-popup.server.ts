import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";
import {
  isPopupCtaType,
  MARKETING_POPUP_OFF,
  normalizePopupDelaySeconds,
  type MarketingPopup,
} from "@/lib/marketing-popup";

const MARKETING_POPUP_ID = 1;

/** Cache/revalidation tag — the admin editor busts this on save. */
export const MARKETING_POPUP_CACHE_TAG = "marketing-popup";

function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The live popup config from the `marketing_popup` table. Falls back to "off"
 * whenever Supabase is absent, the row/table is missing, or the read fails — a
 * settings lookup never pops a modal by accident and never blocks a page.
 */
export async function getMarketingPopup(): Promise<MarketingPopup> {
  if (!HAS_SUPABASE) return MARKETING_POPUP_OFF;

  try {
    const supabase = createAnonSupabaseClient();
    if (!supabase) return MARKETING_POPUP_OFF;

    const { data, error } = await supabase
      .from("marketing_popup")
      .select(
        "enabled, image_url, title, body, cta_type, cta_label, cta_href, cta_code, delay_seconds",
      )
      .eq("id", MARKETING_POPUP_ID)
      .maybeSingle();

    if (error || !data) {
      if (error && error.code !== "PGRST205") {
        console.error("[marketing-popup] load failed", error);
      }
      return MARKETING_POPUP_OFF;
    }

    const row = data as {
      enabled: boolean | null;
      image_url: string | null;
      title: string | null;
      body: string | null;
      cta_type: string | null;
      cta_label: string | null;
      cta_href: string | null;
      cta_code: string | null;
      delay_seconds: number | string | null;
    };
    const ctaType =
      row.cta_type && isPopupCtaType(row.cta_type) ? row.cta_type : "none";
    return {
      enabled: Boolean(row.enabled),
      imageUrl: row.image_url ?? "",
      title: row.title ?? "",
      body: row.body ?? "",
      ctaType,
      ctaLabel: row.cta_label ?? "",
      ctaHref: row.cta_href ?? "",
      ctaCode: row.cta_code ?? "",
      delaySeconds: normalizePopupDelaySeconds(Number(row.delay_seconds ?? 0)),
    };
  } catch (error) {
    console.error("[marketing-popup] load failed", error);
    return MARKETING_POPUP_OFF;
  }
}

/** Cached read for storefront rendering (revalidated every 60s or on tag bust),
 *  so mounting the popup in SiteShell doesn't force pages dynamic. */
export const getMarketingPopupCached = unstable_cache(
  getMarketingPopup,
  ["marketing-popup-config"],
  { revalidate: 60, tags: [MARKETING_POPUP_CACHE_TAG] },
);
