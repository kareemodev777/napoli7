import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { isAdminUser } from "@/lib/auth/roles";
import { countActionableOrders } from "@/lib/admin/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight polling endpoint for the admin notification bell. Returns the
 * count of orders the kitchen still needs to treat. Returns JSON 401 (not a
 * redirect) for non-admins so the client poller fails cleanly.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const count = await countActionableOrders();
  return NextResponse.json(
    { count },
    { headers: { "Cache-Control": "no-store" } },
  );
}
