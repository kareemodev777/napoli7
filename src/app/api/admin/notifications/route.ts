import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { isAdminUser } from "@/lib/auth/roles";
import { getAdminNotificationSnapshot } from "@/lib/admin/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin notification snapshot — actionable order count + unread message count,
 * each with a short recent list, for the floating dropdown and sidebar badges.
 * Returns JSON 401 (not a redirect) for non-admins so the client poller fails
 * cleanly.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const snapshot = await getAdminNotificationSnapshot();
  return NextResponse.json(snapshot, {
    headers: { "Cache-Control": "no-store" },
  });
}
