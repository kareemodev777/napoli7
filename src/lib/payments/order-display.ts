/**
 * Pure presentation helpers that combine an order's fulfilment status with its
 * payment method + payment status. A card order isn't really "Received" until
 * it's paid, so the UI must not show the bare fulfilment status for an unpaid
 * card order. No React / IO here, so this is shared by the customer order list,
 * the admin orders table, and unit tests.
 */

export type PaymentTone = "paid" | "unpaid" | "cod" | "warn";

export interface OrderPaymentFields {
  /** fulfilment: received | preparing | out_for_delivery | delivered | cancelled */
  status: string;
  /** cod | card */
  paymentMethod: string;
  /** pending | paid | failed | refunded | partially_refunded | disputed */
  paymentStatus: string;
}

/** Compact method + payment label for the admin table, e.g. "Card · Unpaid". */
export function paymentSummary(
  paymentMethod: string,
  paymentStatus: string,
): { label: string; tone: PaymentTone } {
  if (paymentMethod !== "card") return { label: "COD", tone: "cod" };
  switch (paymentStatus) {
    case "paid":
      return { label: "Card · Paid", tone: "paid" };
    case "pending":
      return { label: "Card · Unpaid", tone: "unpaid" };
    case "failed":
      return { label: "Card · Failed", tone: "unpaid" };
    case "refunded":
      return { label: "Card · Refunded", tone: "warn" };
    case "partially_refunded":
      return { label: "Card · Part refund", tone: "warn" };
    case "disputed":
      return { label: "Card · Disputed", tone: "warn" };
    default:
      return { label: `Card · ${paymentStatus}`, tone: "unpaid" };
  }
}

export type CustomerOrderView =
  /** Show the normal fulfilment StatusBadge. */
  | { kind: "status" }
  /** Card order not paid yet — offer to finish payment. */
  | { kind: "awaiting_payment" }
  /** Card payment abandoned / declined / expired. */
  | { kind: "payment_failed" };

/**
 * What a customer should see for an order in their list. A card order that
 * hasn't been paid must NOT read as "Received": still-pending shows
 * "Awaiting payment" (with a finish-payment CTA), and a failed/expired session
 * shows "Payment failed". Everything else — COD, paid, refunded, cancelled —
 * shows its normal fulfilment status.
 */
export function customerOrderView(order: OrderPaymentFields): CustomerOrderView {
  if (order.paymentMethod === "card" && order.status !== "cancelled") {
    if (order.paymentStatus === "pending") return { kind: "awaiting_payment" };
    if (order.paymentStatus === "failed") return { kind: "payment_failed" };
  }
  return { kind: "status" };
}
