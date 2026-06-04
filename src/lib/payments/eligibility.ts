/**
 * Pure guards deciding whether a Stripe Checkout session may be created/continued
 * for an order, and whether a webcheckout-completed event may fulfill it. No I/O,
 * so both the route and the webhook can share one tested rule set.
 */

export interface OrderPaymentState {
  /** order_status: received | preparing | out_for_delivery | delivered | cancelled */
  status: string;
  /** payment_method: cod | card */
  paymentMethod: string;
  /** payment_status: pending | paid | failed | refunded */
  paymentStatus: string;
}

export type CheckoutEligibility =
  | { ok: true }
  | { ok: false; alreadyPaid: boolean; reason: string };

/**
 * A Stripe session may only be created for a card order that is still pending and
 * not cancelled. Anything else (COD, already paid, failed/refunded, cancelled)
 * is refused so we never spawn a payment for an order that shouldn't be charged.
 */
export function cardCheckoutEligibility(
  order: OrderPaymentState,
): CheckoutEligibility {
  if (order.paymentMethod !== "card") {
    return {
      ok: false,
      alreadyPaid: false,
      reason: "This order is not a card payment.",
    };
  }
  if (order.status === "cancelled") {
    return {
      ok: false,
      alreadyPaid: false,
      reason: "This order was cancelled and can no longer be paid.",
    };
  }
  if (order.paymentStatus === "paid") {
    return {
      ok: false,
      alreadyPaid: true,
      reason: "This order is already paid.",
    };
  }
  if (order.paymentStatus !== "pending") {
    return {
      ok: false,
      alreadyPaid: false,
      reason: "This order is no longer awaiting payment.",
    };
  }
  return { ok: true };
}

/**
 * Whether a `checkout.session.completed` event should actually fulfill the order.
 * A cancelled order must never be fulfilled even if a late/duplicate Stripe event
 * arrives for it. (The pending->paid transition is enforced atomically in SQL;
 * this is the readable rule the query encodes.)
 */
export function canFulfillCompletedCheckout(order: {
  status: string;
}): boolean {
  return order.status !== "cancelled";
}
