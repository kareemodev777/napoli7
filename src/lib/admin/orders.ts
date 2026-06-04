import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Count "actionable" orders the kitchen still needs to treat.
 *
 * An order is actionable when it is `received` AND either paid up front (card)
 * or cash on delivery. This deliberately EXCLUDES abandoned card checkouts —
 * a `received` + `card` + `pending` order is one the customer never paid for,
 * so counting it would flood the kitchen with phantom tickets.
 */
export async function countActionableOrders(): Promise<number> {
  if (!HAS_SUPABASE_SERVICE) return 0;

  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "received")
    .or("payment_method.eq.cod,payment_status.eq.paid");

  if (error) {
    console.error("[admin/orders] actionable count failed:", error);
    return 0;
  }
  return count ?? 0;
}
