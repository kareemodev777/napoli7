import { unstable_cache } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";
import {
  MENU_DISCOUNT_OFF,
  normalizeMenuDiscountPercent,
  type MenuDiscount,
} from "@/lib/menu-discount";

const MENU_DISCOUNT_ID = 1;

/** Cache key + revalidation tag — the admin editor calls revalidateTag(this) so a
 *  saved change shows up without waiting out the time-based window. */
export const MENU_DISCOUNT_CACHE_TAG = "menu-discount";

function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * The live sale config, read from the `menu_discount` table. Falls back to "off"
 * whenever Supabase is absent, the row/table is missing, or the read fails — a
 * settings lookup never turns a discount on by accident and never blocks a page
 * or a checkout. Use this in the authoritative checkout path so an expired sale is
 * never honoured; use {@link getMenuDiscountCached} for page/layout rendering.
 */
export async function getMenuDiscount(): Promise<MenuDiscount> {
  if (!HAS_SUPABASE) return MENU_DISCOUNT_OFF;

  try {
    const supabase = createAnonSupabaseClient();
    if (!supabase) return MENU_DISCOUNT_OFF;

    const { data, error } = await supabase
      .from("menu_discount")
      .select("enabled, percent, starts_at, ends_at, label")
      .eq("id", MENU_DISCOUNT_ID)
      .maybeSingle();

    if (error || !data) {
      // PGRST205 = table/row absent (fresh DB before the migration). Stay quiet on
      // that; log anything else.
      if (error && error.code !== "PGRST205") {
        console.error("[menu-discount] load failed", error);
      }
      return MENU_DISCOUNT_OFF;
    }

    const row = data as {
      enabled: boolean | null;
      percent: number | string | null;
      starts_at: string | null;
      ends_at: string | null;
      label: string | null;
    };
    return {
      enabled: Boolean(row.enabled),
      percent: normalizeMenuDiscountPercent(Number(row.percent)),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      label: row.label ?? "",
    };
  } catch (error) {
    console.error("[menu-discount] load failed", error);
    return MENU_DISCOUNT_OFF;
  }
}

/**
 * Cached read for page/layout rendering (revalidated every 60s or on tag bust),
 * so mounting the discount config in the root layout doesn't force every page to
 * be dynamic. The raw window is shipped to the client, which recomputes whether
 * the sale is live against its own clock — so the exact start/end boundary flips
 * without needing a fresh fetch.
 */
export const getMenuDiscountCached = unstable_cache(
  getMenuDiscount,
  ["menu-discount-config"],
  { revalidate: 60, tags: [MENU_DISCOUNT_CACHE_TAG] },
);
