import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HAS_SUPABASE } from "@/lib/env";

export const DEFAULT_DELIVERY_MIN_SUBTOTAL_AED = 13;
const DELIVERY_SETTINGS_KEY = "delivery_min_subtotal_aed";


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

/** Flat per-order charge on every delivery. Pickup never pays it, and unlike the
 *  delivery fee it is NOT waived by the free-delivery threshold. */
export const SERVICE_FEE_AED = 3;

/**
 * The delivery fee we advertise, for surfaces that must quote a figure before an
 * area is known — the cart, which has no zone yet. It is a QUOTE, not the charge:
 * the amount billed is always the matched zone's `fee_aed` (every zone is 9 AED
 * today, so the two agree). Never compute a total from this.
 */
export const STANDARD_DELIVERY_FEE_AED = 9;

/** At or above this item subtotal, the delivery fee is waived (the service fee is
 *  not). Measured against the ITEM SUBTOTAL, like the delivery minimum — fees do
 *  not count toward it, and neither does a promo discount. */
export const FREE_DELIVERY_MIN_SUBTOTAL_AED = 80;

export interface OrderFeesAed {
  deliveryFeeAed: number;
  serviceFeeAed: number;
}

/**
 * The single place both fees are decided. Every surface that quotes or charges
 * them — cart, checkout, the server guard, Stripe, the POS — derives them here,
 * so they cannot disagree about what an order costs.
 *
 * Pickup pays neither fee. Delivery always pays the service fee, and pays the
 * zone's delivery fee unless the subtotal has earned free delivery.
 */
export function computeOrderFeesAed({
  deliveryType,
  subtotalAed,
  zoneFeeAed,
}: {
  deliveryType: "delivery" | "pickup";
  subtotalAed: number;
  zoneFeeAed: number;
}): OrderFeesAed {
  if (deliveryType !== "delivery") {
    return { deliveryFeeAed: 0, serviceFeeAed: 0 };
  }
  return {
    deliveryFeeAed: qualifiesForFreeDelivery(subtotalAed) ? 0 : zoneFeeAed,
    serviceFeeAed: SERVICE_FEE_AED,
  };
}

/** Whether the item subtotal has earned free delivery (the 9 AED fee, not the 3). */
export function qualifiesForFreeDelivery(subtotalAed: number): boolean {
  return Math.max(0, subtotalAed) >= FREE_DELIVERY_MIN_SUBTOTAL_AED;
}

/** What is still needed to reach free delivery, or 0 once it is earned. */
export function amountToFreeDeliveryAed(subtotalAed: number): number {
  const remaining = FREE_DELIVERY_MIN_SUBTOTAL_AED - Math.max(0, subtotalAed);
  return remaining > 0 ? Math.round(remaining * 100) / 100 : 0;
}

/**
 * The amount the customer pays. `serviceFeeAed` is required, not defaulted: a
 * silent 0 would let the fee vanish from a total that a caller forgot to pass it
 * to, and the totals here are reconciled against Stripe and the POS.
 */
export function getDeliveryOrderTotalAed({
  subtotalAed,
  deliveryFeeAed,
  serviceFeeAed,
  discountAed = 0,
}: {
  subtotalAed: number;
  deliveryFeeAed: number;
  serviceFeeAed: number;
  discountAed?: number;
}): number {
  return (
    Math.max(0, subtotalAed - discountAed) + deliveryFeeAed + serviceFeeAed
  );
}

/**
 * Whether a delivery order clears the minimum. The minimum is measured against
 * the ITEM SUBTOTAL ONLY — the delivery fee is never counted toward it. So a
 * 4 AED item with a 12 AED delivery fee does NOT qualify for a 13 AED minimum,
 * even though subtotal + fee would be 16. `deliveryFeeAed`/`discountAed` are
 * accepted for a stable call-site signature but intentionally ignored here.
 */
export function meetsDeliveryMinimumAed({
  subtotalAed,
  minimumAed,
}: {
  subtotalAed: number;
  deliveryFeeAed?: number;
  discountAed?: number;
  minimumAed: number;
}): boolean {
  return Math.max(0, subtotalAed) >= minimumAed;
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
      ? value
      : DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
    return normalizeDeliveryMinimumSubtotalAed(effectiveValue);
  } catch (error) {
    console.error("[delivery-settings] load failed", error);
    return DEFAULT_DELIVERY_MIN_SUBTOTAL_AED;
  }
}
