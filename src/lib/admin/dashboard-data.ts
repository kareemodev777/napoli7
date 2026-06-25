import "server-only";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildDashboard,
  dashboardFetchStart,
  type DashboardData,
  type DashboardOrder,
  type DashboardRange,
} from "./dashboard";

export interface LiveSnapshot {
  actionableOrders: number;
  openOrders: number;
  catalogItems: number;
  activePromos: number;
  activeZones: number;
}

/** Range-driven metrics (KPIs, chart, breakdowns) for the selected period. */
export async function loadDashboard(range: DashboardRange): Promise<DashboardData> {
  const now = new Date();
  if (!HAS_SUPABASE_SERVICE) return buildDashboard([], range, now);

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "created_at, total_aed, status, payment_method, payment_status, delivery_type, order_items(product_name, quantity, line_total_aed)",
    )
    .gte("created_at", dashboardFetchStart(range, now).toISOString())
    .order("created_at", { ascending: true })
    .limit(10000);

  return buildDashboard((data ?? []) as DashboardOrder[], range, now);
}

/** Point-in-time figures that don't depend on the date filter. */
export async function loadLiveSnapshot(): Promise<LiveSnapshot> {
  const empty: LiveSnapshot = {
    actionableOrders: 0,
    openOrders: 0,
    catalogItems: 0,
    activePromos: 0,
    activeZones: 0,
  };
  if (!HAS_SUPABASE_SERVICE) return empty;

  const supabase = createServiceRoleClient();
  const [actionable, open, catalog, promos, zones] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "received")
      .or("payment_method.eq.cod,payment_status.eq.paid"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["received", "preparing", "out_for_delivery"]),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("promo_codes")
      .select("code", { count: "exact", head: true })
      .eq("active", true),
    supabase
      .from("delivery_zones")
      .select("area", { count: "exact", head: true })
      .eq("active", true),
  ]);

  return {
    actionableOrders: actionable.count ?? 0,
    openOrders: open.count ?? 0,
    catalogItems: catalog.count ?? 0,
    activePromos: promos.count ?? 0,
    activeZones: zones.count ?? 0,
  };
}
