import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/require-auth";
import { isAdminUser } from "@/lib/auth/roles";
import { fetchSalesSeries } from "@/lib/admin/sales-data";
import { parseSalesRange } from "@/lib/admin/sales";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sales time-series for the dashboard chart, filtered by range (week/month/year).
 * Admin-only; returns JSON 401 for non-admins so the client fails cleanly.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !(await isAdminUser(user))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const range = parseSalesRange(request.nextUrl.searchParams.get("range"));
  const series = await fetchSalesSeries(range);
  return NextResponse.json(series, {
    headers: { "Cache-Control": "no-store" },
  });
}
