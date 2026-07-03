"use server";

import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";

/**
 * Mark every currently actionable (received + paid/COD) order as acknowledged.
 * Called when the admin views the orders queue or opens the notification bell —
 * it stops the ringing alarm durably (across reloads and other devices) until a
 * genuinely new, still-unacknowledged order arrives.
 */
export async function acknowledgeActionableOrders(): Promise<void> {
  await requireAdmin();
  if (!HAS_SUPABASE_SERVICE) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("orders")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("status", "received")
    .or("payment_method.eq.cod,payment_status.eq.paid")
    .is("acknowledged_at", null);

  if (error) {
    console.error("[admin/orders] acknowledge failed:", error);
  }
}
