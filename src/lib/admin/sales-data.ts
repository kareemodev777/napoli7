import "server-only";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  buildSalesSeries,
  salesWindowStart,
  type SalesOrder,
  type SalesRange,
  type SalesSeries,
} from "./sales";

/** Fetch confirmed orders in the range's window and bucket them for the chart. */
export async function fetchSalesSeries(range: SalesRange): Promise<SalesSeries> {
  const now = new Date();
  if (!HAS_SUPABASE_SERVICE) return buildSalesSeries([], range, now);

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("orders")
    .select("created_at, total_aed, status, payment_method, payment_status")
    .gte("created_at", salesWindowStart(range, now).toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  return buildSalesSeries((data ?? []) as SalesOrder[], range, now);
}
