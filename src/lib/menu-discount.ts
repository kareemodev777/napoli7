/**
 * Pure helpers and types for the site-wide automatic menu discount. Kept free of
 * any server/Supabase import so client components (price displays, the cart) can
 * consume {@link resolveMenuDiscount} / {@link discountedPriceAed} directly. The
 * database reader lives in `menu-discount.server.ts`.
 *
 * A site-wide automatic discount on menu items — the "Grand Opening – 50% OFF"
 * promotion and anything like it. Unlike a promo code it needs no code, no login,
 * and no manual redemption: while it is active every order gets the percentage
 * off its item subtotal. It is applied through the same `discount` channel as
 * promo codes, so — like every discount — it comes off the item subtotal ONLY and
 * never touches the delivery or service fee (see getDeliveryOrderTotalAed).
 *
 * The rate and the on/off window are admin-configurable (a single row in the
 * `menu_discount` table) so the shop can start, extend, or end the sale without a
 * deploy.
 */
export interface MenuDiscount {
  enabled: boolean;
  /** 0–100. 50 means half price. */
  percent: number;
  /** ISO timestamp the sale starts, or null for "no start bound". */
  startsAt: string | null;
  /** ISO timestamp the sale ends, or null for "no end bound". */
  endsAt: string | null;
  /** Customer-facing name, e.g. "Grand Opening – 50% OFF". */
  label: string;
}

/**
 * The resolved, point-in-time view the UI and the pricing math consume: whether
 * the sale is live right now, and by how much. Derived from a {@link MenuDiscount}
 * plus the current clock, so the raw config can be cached/shipped to the client
 * while `active` still flips correctly as the window opens and closes.
 */
export interface MenuDiscountSnapshot {
  active: boolean;
  percent: number;
  label: string;
}

/** Off by default — a missing table, missing row, or failed read never turns a
 *  sale on, and never blocks checkout. */
export const MENU_DISCOUNT_OFF: MenuDiscount = {
  enabled: false,
  percent: 0,
  startsAt: null,
  endsAt: null,
  label: "",
};

export const INACTIVE_SNAPSHOT: MenuDiscountSnapshot = {
  active: false,
  percent: 0,
  label: "",
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Clamp any stored/entered percent into a sane 0–100 with cents precision. */
export function normalizeMenuDiscountPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, round2(value)));
}

/**
 * Whether the sale is live at `nowMs`, and the resolved percent/label. Pure and
 * clock-injectable so it is testable and so the client can recompute `active`
 * against its own clock (the raw window is shipped down; the boundary flips
 * without a round-trip).
 */
export function resolveMenuDiscount(
  md: MenuDiscount,
  nowMs: number = Date.now(),
): MenuDiscountSnapshot {
  const startOk = md.startsAt === null || nowMs >= Date.parse(md.startsAt);
  const endOk = md.endsAt === null || nowMs <= Date.parse(md.endsAt);
  const active = md.enabled && md.percent > 0 && startOk && endOk;
  return {
    active,
    percent: active ? md.percent : 0,
    label: md.label,
  };
}

/**
 * The AED taken off an order's ITEM SUBTOTAL by the active sale — 0 when it is
 * not live. Rounded to cents. The caller folds this into the same `discount`
 * total as promo codes, which is then capped at the subtotal; fees are added on
 * top afterwards and are never reduced.
 */
export function menuDiscountAmountAed(
  subtotalAed: number,
  snapshot: MenuDiscountSnapshot,
): number {
  if (!snapshot.active || snapshot.percent <= 0) return 0;
  return round2(Math.max(0, subtotalAed) * (snapshot.percent / 100));
}

/** A single item/price with the sale applied, for menu display (e.g. a struck-out
 *  original beside the sale price). Returns the price unchanged when not live. */
export function discountedPriceAed(
  priceAed: number,
  snapshot: MenuDiscountSnapshot,
): number {
  if (!snapshot.active || snapshot.percent <= 0) return priceAed;
  return round2(priceAed * (1 - snapshot.percent / 100));
}
