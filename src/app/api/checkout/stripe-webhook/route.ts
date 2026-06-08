import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendKitchenNotificationsForOrder } from "@/lib/notifications/kitchen";
import { pushOrderToPos } from "@/lib/pos/push";
import { redeemPromo } from "@/lib/promo";
import { HAS_STRIPE, HAS_SUPABASE_SERVICE } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!HAS_STRIPE || !HAS_SUPABASE_SERVICE) {
    console.warn(
      "[stripe-webhook] received event but env vars not set; ignoring.",
    );
    return new NextResponse("not configured", { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new NextResponse("missing signature", { status: 400 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not set");
    return new NextResponse("misconfigured", { status: 500 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] signature verification failed:", err);
    return new NextResponse("invalid signature", { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id;
        // Atomic, idempotent transition: only the FIRST delivery of this event
        // flips pending -> paid and gets a row back. Stripe retries (at-least-
        // once delivery) match no row, so the kitchen is notified exactly once.
        const { data: transitioned, error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent: paymentIntentId,
          })
          .eq("id", orderId)
          .eq("payment_method", "card")
          .eq("payment_status", "pending")
          .neq("status", "cancelled")
          .select("id, promo_code");

        if (updateError) {
          console.error(
            "[stripe-webhook] paid transition failed:",
            updateError,
          );
          // 500 so Stripe retries rather than dropping the paid signal.
          return new NextResponse("update failed", { status: 500 });
        }

        if (transitioned && transitioned.length > 0) {
          // Real pending -> paid transition: now (and only now) fulfill.
          await sendKitchenNotificationsForOrder(orderId);

          // Push to the POS, guarded by the same atomic transition so it fires
          // exactly once. Best-effort and never throws — it must NOT change this
          // route's 200 response, or Stripe would retry the whole webhook on a
          // brief POS outage (POS retry is handled internally + via pos_push_log).
          await pushOrderToPos(orderId);

          // Redeem the promo now that the card payment is confirmed. Guarded by
          // the pending -> paid transition above, so Stripe retries never
          // double-count it.
          const promoCode = transitioned[0]?.promo_code;
          if (promoCode) {
            try {
              await redeemPromo(promoCode);
            } catch (e) {
              console.error("[stripe-webhook] promo redeem failed:", e);
            }
          }
        }
      }
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("stripe_payment_intent", pi.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        await supabase
          .from("orders")
          .update({ payment_status: "refunded" })
          .eq("stripe_payment_intent", pi);
      }
      break;
    }
  }

  return new NextResponse("ok");
}
