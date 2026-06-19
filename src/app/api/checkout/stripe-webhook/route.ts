import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendKitchenNotificationsForOrder } from "@/lib/notifications/kitchen";
import { notifyStaffAlertEmail } from "@/lib/notifications/email";
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
        // flips a not-yet-paid order to paid and gets a row back. Stripe retries
        // (at-least-once delivery) match no row, so the kitchen is notified
        // exactly once.
        //
        // We accept BOTH `pending` and `failed` as the source state: a card
        // declined in the still-open Checkout session fires
        // payment_intent.payment_failed (-> failed), but the customer can then
        // retry with another card in that same session and succeed. The success
        // must be able to recover the order from `failed`. We deliberately do
        // NOT accept refunded/disputed/partially_refunded here, so a re-delivered
        // completed event can never resurrect an already-resolved order.
        const { data: transitioned, error: updateError } = await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent: paymentIntentId,
          })
          .eq("id", orderId)
          .eq("payment_method", "card")
          .in("payment_status", ["pending", "failed"])
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
      // Match by the order id carried on the PaymentIntent metadata (set via
      // `payment_intent_data` when the session is created). A first-attempt
      // failure has no stored PI id yet, so matching on `stripe_payment_intent`
      // alone matched zero rows and the order stayed stuck `pending` (Bug 1).
      const orderId = pi.metadata?.orderId;
      if (orderId) {
        // Only flip a still-pending card order. Never clobber a paid/refunded
        // order if a late failure event arrives for a since-succeeded retry.
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", orderId)
          .eq("payment_method", "card")
          .eq("payment_status", "pending");
      } else {
        // Fallback for any legacy session created before metadata propagation.
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("stripe_payment_intent", pi.id)
          .eq("payment_status", "pending");
      }
      break;
    }
    case "checkout.session.expired": {
      // Stripe expires an abandoned Checkout session (~24h). Resolve the order
      // so it doesn't leak as `pending` forever (Bugs 2 & 3). Promo is redeemed
      // only on `completed`, so nothing to restore here.
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await supabase
          .from("orders")
          .update({ payment_status: "failed" })
          .eq("id", orderId)
          .eq("payment_method", "card")
          .eq("payment_status", "pending");
      }
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (pi) {
        // `charge.refunded` fires for partial refunds too. Distinguish a full
        // refund from a partial one instead of always recording `refunded`
        // (Bug 5). `amount` is the captured total; `amount_refunded` the sum
        // refunded so far.
        const fullyRefunded =
          charge.amount_refunded >= charge.amount;
        await supabase
          .from("orders")
          .update({
            payment_status: fullyRefunded ? "refunded" : "partially_refunded",
          })
          .eq("stripe_payment_intent", pi);
      }
      break;
    }
    case "charge.dispute.created": {
      // A chargeback was opened — money may be clawed back after the kitchen has
      // already cooked. Flag the order and alert staff so it isn't silent (Bug 6).
      const dispute = event.data.object;
      const pi =
        typeof dispute.payment_intent === "string"
          ? dispute.payment_intent
          : dispute.payment_intent?.id;
      if (pi) {
        const { data: disputed } = await supabase
          .from("orders")
          .update({ payment_status: "disputed" })
          .eq("stripe_payment_intent", pi)
          .select("order_number, total_aed");
        const order = disputed?.[0];
        try {
          await notifyStaffAlertEmail({
            subject: `⚠️ Chargeback opened — order ${order?.order_number ?? "(unknown)"}`,
            heading: "A card payment is being disputed",
            intro:
              "A cardholder has opened a dispute (chargeback). Respond in the Stripe Dashboard before the deadline or the payment is lost.",
            details: [
              ["Order", order?.order_number ?? "unknown"],
              ["Amount", order ? `${Number(order.total_aed).toFixed(2)} AED` : "unknown"],
              ["Reason", dispute.reason ?? "unspecified"],
              ["Dispute status", dispute.status ?? "unspecified"],
            ],
          });
        } catch (e) {
          console.error("[stripe-webhook] dispute alert failed:", e);
        }
      }
      break;
    }
  }

  return new NextResponse("ok");
}
