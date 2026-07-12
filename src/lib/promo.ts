import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface PromoRow {
  code: string;
  discount_aed: number | null;
  discount_pct: number | null;
  min_subtotal_aed: number;
  valid_from: string | null;
  valid_until: string | null;
  max_uses: number | null;
  times_used: number;
  active: boolean;
  auto_generated: boolean;
}

export interface PromoResult {
  /** Present only on success — the canonical (uppercased) code. */
  code?: string;
  /** Discount in AED, rounded to 2dp and capped at the subtotal. */
  amount?: number;
  /** True for an auto-generated signup reward (drives the pickup-only rule). */
  isReward?: boolean;
  /** Present only on failure — a customer-facing message. */
  error?: string;
}

// Demo codes used when Supabase service env vars are absent (graceful fallback,
// matching the catalog mock pattern). Keep in sync with the seed in 007.
const MOCK_PROMOS: PromoRow[] = [
  {
    code: "WELCOME10",
    discount_aed: null,
    discount_pct: 10,
    min_subtotal_aed: 0,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    times_used: 0,
    active: true,
    auto_generated: false,
  },
  {
    code: "NAPOLI20",
    discount_aed: 20,
    discount_pct: null,
    min_subtotal_aed: 80,
    valid_from: null,
    valid_until: null,
    max_uses: null,
    times_used: 0,
    active: true,
    auto_generated: false,
  },
];

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure discount calculation. Validates the redemption window, min subtotal and
 * usage cap, then returns the AED discount (capped at the subtotal) or a
 * customer-facing error.
 */
export function computeDiscount(row: PromoRow, subtotal: number): PromoResult {
  if (!row.active) return { error: "This code is no longer active." };

  const now = Date.now();
  if (row.valid_from && Date.parse(row.valid_from) > now) {
    return { error: "This code isn't active yet." };
  }
  if (row.valid_until && Date.parse(row.valid_until) < now) {
    return { error: "This code has expired." };
  }
  if (row.max_uses != null && row.times_used >= row.max_uses) {
    return { error: "This code has reached its usage limit." };
  }
  if (subtotal < row.min_subtotal_aed) {
    return {
      error: `Spend at least ${row.min_subtotal_aed.toFixed(2)} AED to use this code.`,
    };
  }

  const raw =
    row.discount_pct != null
      ? subtotal * (row.discount_pct / 100)
      : (row.discount_aed ?? 0);
  const amount = round2(Math.min(raw, subtotal));
  if (amount <= 0) return { error: "This code has no discount value." };

  return { code: row.code, amount };
}

async function lookupPromo(code: string): Promise<PromoRow | null> {
  const normalized = normalizeCode(code);

  if (!HAS_SUPABASE_SERVICE) {
    return MOCK_PROMOS.find((p) => p.code === normalized) ?? null;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error) {
    console.error("[promo] lookup failed", error);
    return null;
  }
  if (!data) return null;

  // numeric columns can deserialize as strings — coerce for safe arithmetic.
  return {
    code: data.code,
    discount_aed: data.discount_aed == null ? null : Number(data.discount_aed),
    discount_pct: data.discount_pct == null ? null : Number(data.discount_pct),
    min_subtotal_aed: Number(data.min_subtotal_aed),
    valid_from: data.valid_from,
    valid_until: data.valid_until,
    max_uses: data.max_uses == null ? null : Number(data.max_uses),
    times_used: Number(data.times_used),
    active: data.active,
    auto_generated: Boolean(data.auto_generated),
  };
}

/** The signed-in customer, used to gate personal (free-pizza) reward codes. */
export interface PromoIdentity {
  userId?: string | null;
  /** The AUTHENTICATED account email (not a typed order email — can't be spoofed). */
  email?: string | null;
}

/**
 * Validate a code against a subtotal. Shared by the cart action and placeOrder.
 *
 * A reward code is NOT bound to the account redeeming it. It used to be: a code
 * could only be spent by the customer who earned it, and anyone else was turned
 * away. That makes the whole point of the offer impossible — the client wants
 * three friends to be able to pool their codes onto one basket, paid for from one
 * account, and a code "remains linked to the customer who earned it but can be
 * redeemed in any order, even if the order is placed using another customer's
 * account".
 *
 * What stops a leaked code being farmed is not who is holding it: it is that each
 * code is redeemable exactly once (max_uses = 1, enforced in redeemPromo), and
 * that codes are only minted one per registered mobile. Ownership was never the
 * thing doing the work.
 *
 * `identity` is still accepted so callers need not change, and so the ownership
 * rule can be reinstated for some future non-transferable code without another
 * signature change.
 */
export async function validatePromo(
  code: string,
  subtotal: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept so callers
  // need not change, and so a future non-transferable code can reinstate the
  // ownership rule without another signature change.
  _identity?: PromoIdentity,
): Promise<PromoResult> {
  const normalized = normalizeCode(code);
  if (!normalized) return { error: "Enter a promo code." };

  const row = await lookupPromo(normalized);
  if (!row) return { error: "That promo code isn't valid." };

  const result = computeDiscount(row, subtotal);
  if (result.code) result.isReward = row.auto_generated;
  return result;
}

/**
 * Whether a promo redemption was actually consumed for an order — and therefore
 * needs crediting back when the order is cancelled. COD consumes the code at
 * placement; card only after the payment succeeds. Pure for unit testing; the
 * authoritative, race-safe check lives in the `claim_promo_restore` RPC.
 */
export function promoRedemptionWasConsumed(order: {
  promoCode: string | null;
  paymentMethod: "cod" | "card";
  paymentStatus: string;
}): boolean {
  if (!order.promoCode) return false;
  return order.paymentMethod === "cod" || order.paymentStatus === "paid";
}

/**
 * Credit back exactly one promo redemption for a cancelled order. The
 * `claim_promo_restore` RPC flips the order's `promo_restored` flag false->true
 * and returns the code only on the FIRST call (race-safe, exactly-once); the
 * counter is decremented only when a code comes back. Safe to call repeatedly.
 * Returns true only when a restoration actually happened.
 */
export async function restorePromoForCancelledOrder(
  orderId: string,
): Promise<boolean> {
  if (!HAS_SUPABASE_SERVICE) return false;

  const supabase = createServiceRoleClient();
  // The RPC is the exactly-once latch: it hands the code back only on the FIRST
  // call and marks the order restored, so a double-cancel can't credit twice.
  const { data: code, error } = await supabase.rpc("claim_promo_restore", {
    p_order_id: orderId,
  });
  if (error) {
    console.error("[promo] restore claim failed", error);
    return false;
  }
  if (!code) return false; // nothing redeemed, or already restored

  // The latch returns one code, but an order can carry several — three friends
  // pooling their rewards. Give ALL of them back, or a cancelled order silently
  // burns the codes of everyone but the first.
  const { data: orderRow } = await supabase
    .from("orders")
    .select("promo_codes")
    .eq("id", orderId)
    .maybeSingle();

  const codes: string[] =
    (orderRow?.promo_codes as string[] | null)?.length
      ? (orderRow!.promo_codes as string[])
      : [code as string];

  let allRestored = true;
  for (const promoCode of codes) {
    const { error: restoreError } = await supabase.rpc("restore_promo_code", {
      p_code: promoCode,
    });
    if (restoreError) {
      // The latch already marked the order restored, so this cannot be retried
      // by re-cancelling. Log loudly for manual reconciliation.
      console.error(
        `[promo] counter decrement failed for ${promoCode} on order ${orderId}`,
        restoreError,
      );
      allRestored = false;
    }
  }
  return allRestored;
}

/**
 * Atomically redeem a code (increments times_used only if still redeemable).
 * Returns true when redeemed. No-op success in mock mode (no Supabase service).
 */
export async function redeemPromo(code: string): Promise<boolean> {
  const normalized = normalizeCode(code);
  if (!normalized) return false;
  if (!HAS_SUPABASE_SERVICE) return true;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("redeem_promo_code", {
    p_code: normalized,
  });
  if (error) {
    console.error("[promo] redeem failed", error);
    return false;
  }
  return (data ?? 0) > 0;
}
