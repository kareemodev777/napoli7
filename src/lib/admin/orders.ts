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

/**
 * Count actionable orders the admin has NOT yet acknowledged — this drives the
 * ringing alarm, so it stops once the admin has seen the queue and stays silent
 * across reloads/devices (the acknowledgment is a durable order column) until a
 * genuinely new order arrives. Falls back to the plain actionable count if the
 * acknowledged_at column isn't present yet, so a missing migration over-rings
 * (safe) rather than silently dropping the alarm.
 */
export async function countUnacknowledgedOrders(): Promise<number> {
  if (!HAS_SUPABASE_SERVICE) return 0;

  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "received")
    .or("payment_method.eq.cod,payment_status.eq.paid")
    .is("acknowledged_at", null);

  if (error) {
    console.error("[admin/orders] unacknowledged count failed:", error);
    return countActionableOrders();
  }
  return count ?? 0;
}
