import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  orderId: z.string().min(4),
  phone: z.string().min(8),
});

/**
 * Public-ish polling endpoint for the /track page. Protected by the same
 * order-id + phone pair the customer already entered (no session needed), so it
 * exposes nothing a person without both values could not already retrieve via
 * the track form. Returns only the order number and status — no PII.
 *
 * Polling here keeps live updates working without opening Supabase realtime or
 * relaxing RLS on the `orders` table.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    orderId: (searchParams.get("orderId") ?? "").trim(),
    phone: (searchParams.get("phone") ?? "").trim().replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (!HAS_SUPABASE) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, status")
    .or(
      `id.eq.${parsed.data.orderId},order_number.ilike.${parsed.data.orderId}`,
    )
    .eq("customer_phone", parsed.data.phone)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    { orderNumber: order.order_number, status: order.status },
    { headers: { "Cache-Control": "no-store" } },
  );
}
