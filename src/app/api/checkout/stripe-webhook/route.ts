import { NextResponse } from "next/server";
import { getStripe } from "@/lib/payments/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HAS_STRIPE, HAS_SUPABASE_SERVICE } from "@/lib/env";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!HAS_STRIPE || !HAS_SUPABASE_SERVICE) {
    console.warn("[stripe-webhook] received event but env vars not set; ignoring.");
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
        await supabase
          .from("orders")
          .update({
            payment_status: "paid",
            stripe_payment_intent: paymentIntentId,
          })
          .eq("id", orderId);
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
