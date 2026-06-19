import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";

export const DEFAULT_DELIVERY_MIN_SUBTOTAL_AED = 13;
const DELIVERY_SETTINGS_KEY = "delivery_min_subtotal_aed";

// Temporary cap until the admin edit flow is working again. We want the live
// checkout minimum to stay at 13 AED even if an older 28 AED row is still
// present in Supabase.

type DeliverySettingRow = {
  key: string;
  value: number | string | null;
};

function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizeDeliveryMinimumSubtotalAed(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
  return Math.max(0, Math.round(value * 100) / 100);
}

export function getDeliveryOrderTotalAed({
  subtotalAed,
  deliveryFeeAed,
  discountAed = 0,
}: {
  subtotalAed: number;
  deliveryFeeAed: number;
  discountAed?: number;
}): number {
  return Math.max(0, subtotalAed - discountAed) + deliveryFeeAed;
}

export function meetsDeliveryMinimumAed({
  subtotalAed,
  deliveryFeeAed,
  discountAed = 0,
  minimumAed,
}: {
  subtotalAed: number;
  deliveryFeeAed: number;
  discountAed?: number;
  minimumAed: number;
}): boolean {
  return getDeliveryOrderTotalAed({ subtotalAed, deliveryFeeAed, discountAed }) >= minimumAed;
}

export async function getDeliveryMinimumSubtotalAed(): Promise<number> {
  if (!HAS_SUPABASE) return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;

  try {
    const supabase = createAnonSupabaseClient();
    if (!supabase) return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;

    const { data, error } = await supabase
      .from("delivery_settings")
      .select("key, value")
      .eq("key", DELIVERY_SETTINGS_KEY)
      .maybeSingle();

    if (error || !data) {
      if (error && error.code !== "PGRST205") {
        console.error("[delivery-settings] load failed", error);
      }
      return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
    }

    const row = data as DeliverySettingRow;
    const value = Number(row.value);
    const effectiveValue = Number.isFinite(value)
      ? Math.min(value, DEFAULT_DELIVERY_MIN_SUBTOTAL_AED)
      : DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
    return normalizeDeliveryMinimumSubtotalAed(effectiveValue);
  } catch (error) {
    console.error("[delivery-settings] load failed", error);
    return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
  }
}
