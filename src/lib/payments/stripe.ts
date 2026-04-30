import Stripe from "stripe";
import { HAS_STRIPE, SITE_URL } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!HAS_STRIPE) {
    throw new Error(
      "Stripe env vars not set. STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY required."
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
  items: Array<{ name: string; qty: number; unitAmountAed: number }>;
}

export async function createCheckoutSession(input: CreateSessionInput) {
  const stripe = getStripe();
  return stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    currency: "aed",
    customer_email: input.customerEmail,
    line_items: input.items.map((it) => ({
      price_data: {
        currency: "aed",
        product_data: { name: it.name },
        unit_amount: Math.round(it.unitAmountAed * 100),
      },
      quantity: it.qty,
    })),
    metadata: { orderId: input.orderId },
    success_url: `${SITE_URL}/order/${input.orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE_URL}/checkout?canceled=1`,
  });
}
