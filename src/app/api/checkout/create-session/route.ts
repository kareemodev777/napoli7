import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createCheckoutSession, getStripe } from "@/lib/payments/stripe";
import { cardCheckoutEligibility } from "@/lib/payments/eligibility";
import { HAS_STRIPE, HAS_SUPABASE_SERVICE } from "@/lib/env";

export const runtime = "nodejs";

const querySchema = z.object({
  orderId: z.string().uuid(),
});

export async function GET(req: Request) {
  if (!HAS_STRIPE || !HAS_SUPABASE_SERVICE) {
    return NextResponse.json(
      { error: "Stripe or Supabase service env vars not set." },
      { status: 503 },
    );
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid orderId" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, status, payment_method, customer_email, customer_phone, payment_status, stripe_session_id, subtotal_aed, discount_aed, delivery_fee_aed, service_fee_aed, total_aed, promo_code, order_items(product_name, quantity, line_total_aed)",
    )
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const confirmationUrl = new URL(
    `/order/${order.id}/confirmation`,
    req.url,
  ).toString();

  // Refuse to start (or restart) payment for any order that shouldn't be
  // charged: COD, cancelled, already paid, or no longer pending.
  const eligibility = cardCheckoutEligibility({
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
  });
  if (!eligibility.ok) {
    // Already paid — just send them to the confirmation page.
    if (eligibility.alreadyPaid) {
      return NextResponse.redirect(confirmationUrl, 303);
    }
    return NextResponse.json({ error: eligibility.reason }, { status: 409 });
  }

  // Reuse an existing still-open session instead of spawning a duplicate
  // (a refresh of this redirect would otherwise create a new session each time).
  if (order.stripe_session_id) {
    try {
      const existing = await getStripe().checkout.sessions.retrieve(
        order.stripe_session_id,
      );
      if (existing.status === "open" && existing.url) {
        return NextResponse.redirect(existing.url, 303);
      }
    } catch {
      // Stored session is gone/invalid — fall through and create a fresh one.
    }
  }

  const items = (order.order_items ?? []).map(
    (it: {
      product_name: string;
      quantity: number;
      line_total_aed: number | string;
    }) => ({
      name: it.product_name,
      qty: it.quantity,
      lineTotalAed: Number(it.line_total_aed),
    }),
  );

  let session;
  try {
    session = await createCheckoutSession({
      orderId: order.id,
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      items,
      deliveryFeeAed: Number(order.delivery_fee_aed),
      serviceFeeAed: Number(order.service_fee_aed),
      discountAed: Number(order.discount_aed),
      totalAed: Number(order.total_aed),
      promoCode: order.promo_code,
    });
  } catch (e) {
    // Most likely the amount guardrail tripped — never charge a wrong total.
    console.error("[create-session] could not create Stripe session:", e);
    return NextResponse.json(
      { error: "Could not start payment. Please contact us." },
      { status: 500 },
    );
  }

  await supabase
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe did not return a URL" },
      { status: 502 },
    );
  }
  return NextResponse.redirect(session.url, 303);
}
