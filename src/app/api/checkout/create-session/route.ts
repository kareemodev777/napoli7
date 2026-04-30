import { NextResponse } from "next/server";
import { z } from "zod";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createCheckoutSession } from "@/lib/payments/stripe";
import { HAS_STRIPE, HAS_SUPABASE_SERVICE } from "@/lib/env";

export const runtime = "nodejs";

const querySchema = z.object({
  orderId: z.string().uuid(),
});

export async function GET(req: Request) {
  if (!HAS_STRIPE || !HAS_SUPABASE_SERVICE) {
    return NextResponse.json(
      { error: "Stripe or Supabase service env vars not set." },
      { status: 503 }
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
    .select("id, customer_email, order_items(product_name, quantity, line_total_aed)")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = (order.order_items ?? []).map(
    (it: { product_name: string; quantity: number; line_total_aed: number | string }) => ({
      name: it.product_name,
      qty: it.quantity,
      unitAmountAed: Number(it.line_total_aed) / it.quantity,
    })
  );

  const session = await createCheckoutSession({
    orderId: order.id,
    customerEmail: order.customer_email,
    items,
  });

  await supabase
    .from("orders")
    .update({ stripe_session_id: session.id })
    .eq("id", order.id);

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a URL" }, { status: 502 });
  }
  return NextResponse.redirect(session.url, 303);
}
