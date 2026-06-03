import Stripe from "stripe";
import { HAS_STRIPE, SITE_URL } from "@/lib/env";
import {
  buildAndAssertCheckoutAmount,
  type OrderItemAmount,
} from "@/lib/payments/amounts";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!HAS_STRIPE) {
    throw new Error(
      "Stripe env vars not set. STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY required.",
    );
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return cached;
}

interface CreateSessionInput {
  orderId: string;
  customerEmail: string;
  items: OrderItemAmount[];
  /** Authoritative order columns — the charge is reconciled against these. */
  deliveryFeeAed: number;
  discountAed: number;
  totalAed: number;
  promoCode?: string | null;
}

/**
 * Create a Checkout Session that charges EXACTLY `totalAed`.
 *
 * Amount is built from the stored order columns (item line totals + delivery
 * fee, with the promo discount applied as a one-off coupon) and asserted equal
 * to `total_aed` before the session is created — a mismatch throws rather than
 * charging the wrong amount. Session and coupon creation are idempotent on the
 * order id, so retries/refreshes never spawn duplicate charges.
 */
export async function createCheckoutSession(input: CreateSessionInput) {
  const stripe = getStripe();

  const { lines, discountFils } = buildAndAssertCheckoutAmount({
    items: input.items,
    deliveryFeeAed: input.deliveryFeeAed,
    discountAed: input.discountAed,
    totalAed: input.totalAed,
  });

  const line_items = lines.map((l) => ({
    price_data: {
      currency: "aed",
      product_data: { name: l.name },
      unit_amount: l.unitAmountFils,
    },
    quantity: 1,
  }));

  let discounts: Array<{ coupon: string }> | undefined;
  if (discountFils > 0) {
    const coupon = await stripe.coupons.create(
      {
        amount_off: discountFils,
        currency: "aed",
        duration: "once",
        name: input.promoCode ?? "Discount",
      },
      { idempotencyKey: `coupon_${input.orderId}` },
    );
    discounts = [{ coupon: coupon.id }];
  }

  return stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.customerEmail,
      line_items,
      discounts,
      metadata: { orderId: input.orderId },
      success_url: `${SITE_URL}/order/${input.orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/checkout?canceled=1`,
    },
    { idempotencyKey: `session_${input.orderId}` },
  );
}
