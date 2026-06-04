/**
 * Pure money math for editing an order. Kept separate from the server action so
 * the recompute + payment-difference logic is unit-testable and never depends
 * on Supabase. All amounts are AED rounded to 2dp.
 */

export type PaymentHandling =
  | "none"
  | "cash_collected"
  | "cash_refunded"
  | "card_manual";

export interface EditableLine {
  /** Unit price including customizations, derived from the original line. */
  unitPriceAed: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalAed: number;
  deliveryFeeAed: number;
  discountAed: number;
  totalAed: number;
}

export interface PaymentDifference {
  /** new total − old total, rounded. Positive = customer owes more. */
  differenceAed: number;
  direction: "collect" | "refund" | "none";
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Line total for a quantity, never negative. */
export function lineTotal(unitPriceAed: number, quantity: number): number {
  if (quantity <= 0 || unitPriceAed <= 0) return 0;
  return round2(unitPriceAed * quantity);
}

/**
 * Unit price recovered from a stored line. Orders persist `line_total_aed` and
 * `quantity`; dividing recovers the per-unit price (base + customizations) so
 * we can re-price the line when the quantity changes.
 */
export function unitPriceFromLine(
  lineTotalAed: number,
  quantity: number,
): number {
  if (quantity <= 0) return 0;
  return round2(lineTotalAed / quantity);
}

/**
 * Recompute order totals. Discount is clamped to the subtotal (a discount can
 * never exceed the goods), and the total floors at the delivery fee.
 */
export function computeOrderTotals(
  lines: EditableLine[],
  deliveryFeeAed: number,
  discountAed: number,
): OrderTotals {
  const subtotal = round2(
    lines.reduce((sum, l) => sum + lineTotal(l.unitPriceAed, l.quantity), 0),
  );
  const fee = round2(Math.max(0, deliveryFeeAed));
  const discount = round2(Math.min(Math.max(0, discountAed), subtotal));
  const total = round2(Math.max(0, subtotal - discount) + fee);
  return {
    subtotalAed: subtotal,
    deliveryFeeAed: fee,
    discountAed: discount,
    totalAed: total,
  };
}

export function paymentDifference(
  oldTotalAed: number,
  newTotalAed: number,
): PaymentDifference {
  const diff = round2(newTotalAed - oldTotalAed);
  const direction = diff > 0 ? "collect" : diff < 0 ? "refund" : "none";
  return { differenceAed: diff, direction };
}

/**
 * One-line human-readable audit summary appended to the order's admin notes,
 * so the change history is legible even without joining the audit table.
 */
export function describeEdit(args: {
  oldTotalAed: number;
  newTotalAed: number;
  paymentHandling: PaymentHandling;
  note?: string | null;
}): string {
  const { differenceAed, direction } = paymentDifference(
    args.oldTotalAed,
    args.newTotalAed,
  );
  const money = (n: number) => `${n.toFixed(2)} AED`;

  let line: string;
  if (direction === "none") {
    line = `Order edited. Total unchanged at ${money(args.newTotalAed)}.`;
  } else {
    const verb = direction === "collect" ? "Collect" : "Refund";
    line =
      `Order edited. Total ${money(args.oldTotalAed)} → ${money(args.newTotalAed)}. ` +
      `${verb} ${money(Math.abs(differenceAed))}` +
      ` (${labelForHandling(args.paymentHandling)}).`;
  }
  return args.note?.trim() ? `${line} Note: ${args.note.trim()}` : line;
}

export function labelForHandling(handling: PaymentHandling): string {
  switch (handling) {
    case "cash_collected":
      return "cash collected";
    case "cash_refunded":
      return "cash refunded";
    case "card_manual":
      return "card / manual";
    default:
      return "no settlement";
  }
}
