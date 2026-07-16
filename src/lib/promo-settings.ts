import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";

/**
 * How many promo codes one order may stack, by default. Several people at the same
 * address pool their free-pizza codes onto a single basket — one delivery, one fee
 * — instead of placing (and paying delivery on) a separate order each. The shop can
 * raise or lower this from the admin panel without a deploy.
 */
export const DEFAULT_MAX_PROMO_CODES_PER_ORDER = 8;

/**
 * The ceiling the admin value is clamped to, and the hard limit the checkout action
 * accepts on the wire. Kept generous (a large group) but bounded so a typo can't ask
 * the server to validate thousands of codes. Keep in step with the Zod `.max()` on
 * `promoCodes` in the checkout action.
 */
export const PROMO_CODES_HARD_CAP = 50;

const MAX_PROMO_CODES_KEY = "max_promo_codes_per_order";

type SettingRow = { key: string; value: number | string | null };

function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Coerce any stored/entered value into a usable whole-number cap: at least 1 (an
 * order can always carry one code), no more than the hard cap, and a non-finite or
 * fractional input snapped to a sane integer rather than trusted as-is.
 */
export function normalizeMaxPromoCodesPerOrder(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_MAX_PROMO_CODES_PER_ORDER;
  const whole = Math.floor(value);
  return Math.min(PROMO_CODES_HARD_CAP, Math.max(1, whole));
}

/**
 * The live cap, read from the settings table. Falls back to the default whenever
 * Supabase is absent, the row is missing, or the read fails — the checkout is never
 * blocked by a settings lookup.
 */
export async function getMaxPromoCodesPerOrder(): Promise<number> {
  if (!HAS_SUPABASE) return DEFAULT_MAX_PROMO_CODES_PER_ORDER;

  try {
    const supabase = createAnonSupabaseClient();
    if (!supabase) return DEFAULT_MAX_PROMO_CODES_PER_ORDER;

    const { data, error } = await supabase
      .from("delivery_settings")
      .select("key, value")
      .eq("key", MAX_PROMO_CODES_KEY)
      .maybeSingle();

    if (error || !data) {
      // PGRST205 = table/row absent (fresh DB before the migration). Stay quiet on
      // that; log anything else.
      if (error && error.code !== "PGRST205") {
        console.error("[promo-settings] load failed", error);
      }
      return DEFAULT_MAX_PROMO_CODES_PER_ORDER;
    }

    const value = Number((data as SettingRow).value);
    return normalizeMaxPromoCodesPerOrder(value);
  } catch (error) {
    console.error("[promo-settings] load failed", error);
    return DEFAULT_MAX_PROMO_CODES_PER_ORDER;
  }
}
