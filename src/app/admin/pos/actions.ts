"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HAS_POS, HAS_SUPABASE_SERVICE } from "@/lib/env";
import { pushOrderToPos, replayFailedPosPushes } from "@/lib/pos/push";

export interface SyncPosResult {
  error?: string;
  /** pos_sync_status after the attempt: 'sent' | 'failed' | 'pending'. */
  status?: string;
}

/**
 * Manually (re)send one order to the POS order-create endpoint. Admin-only.
 * Guards so the kitchen can never be sent an unpaid card order or a cancelled
 * one — only `paid` cards or `cod` go through. Best-effort push updates
 * pos_sync_status; we read it back to report the outcome.
 */
export async function syncOrderToPos(orderId: string): Promise<SyncPosResult> {
  await requireAdmin();
  if (!HAS_POS) {
    return {
      error:
        "POS integration is off. Set POS_WEBHOOK_URL and POS_PUSH_ENABLED=true.",
    };
  }
  if (!HAS_SUPABASE_SERVICE) {
    return { error: "POS sync needs the Supabase service-role key." };
  }

  const supabase = createServiceRoleClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_method, payment_status, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { error: "Order not found." };

  if (order.status === "cancelled") {
    return { error: "Cancelled orders can't be sent to the POS." };
  }
  const payable =
    order.payment_method === "cod" || order.payment_status === "paid";
  if (!payable) {
    return {
      error: "This card order isn't paid yet — it can't be sent to the POS.",
    };
  }

  await pushOrderToPos(orderId);

  const { data: after } = await supabase
    .from("orders")
    .select("pos_sync_status")
    .eq("id", orderId)
    .maybeSingle();

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/pos");
  return { status: after?.pos_sync_status ?? "failed" };
}

export interface RetryPosResult {
  error?: string;
  replayed?: number;
}

/** Re-send every order still stuck in `failed`. Admin-only. */
export async function retryFailedPosPushes(): Promise<RetryPosResult> {
  await requireAdmin();
  if (!HAS_POS) {
    return {
      error:
        "POS integration is off. Set POS_WEBHOOK_URL and POS_PUSH_ENABLED=true.",
    };
  }
  if (!HAS_SUPABASE_SERVICE) {
    return { error: "POS sync needs the Supabase service-role key." };
  }
  const replayed = await replayFailedPosPushes();
  revalidatePath("/admin/orders");
  revalidatePath("/admin/pos");
  return { replayed };
}
