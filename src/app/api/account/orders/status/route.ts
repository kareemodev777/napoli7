import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authenticated polling endpoint for the signed-in customer's order statuses.
 * Returns a lightweight snapshot (id, order number, status) for the user's own
 * orders so /account/orders can reflect admin status changes without a refresh.
 * Returns JSON 401 (not a redirect) so the client poller fails cleanly.
 */
export async function GET() {
  if (!HAS_SUPABASE) {
    return NextResponse.json({ orders: [] }, { status: 200 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const orders = (data ?? []).map((o) => ({
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    paymentStatus: o.payment_status,
  }));

  return NextResponse.json(
    { orders },
    { headers: { "Cache-Control": "no-store" } },
  );
}
