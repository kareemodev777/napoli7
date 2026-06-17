// DB-sourced POS push orchestrators. These read the persisted order (the source
// of truth) via the service-role client, build the WooCommerce body, POST it with
// retry, and durably record the outcome in pos_push_log. Best-effort: they never
// throw, so a POS outage can never degrade order placement, the Stripe webhook
// response, the admin status change, or the kitchen alerts.

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  HAS_POS,
  HAS_SUPABASE_SERVICE,
  POS_WEBHOOK_URL,
  POS_PRODUCT_WEBHOOK_URL,
} from "@/lib/env";
import { postToPos, type PosPostResult } from "./client";
import {
  orderRowToWooOrder,
  statusToWooUpdate,
  type PosOrderRow,
  type SiteOrderStatus,
} from "./payload";

const ORDER_SELECT =
  "id, order_number, status, customer_name, customer_phone, customer_email, delivery_type, delivery_address, delivery_slot, order_notes, payment_method, payment_status, stripe_payment_intent, subtotal_aed, delivery_fee_aed, discount_aed, promo_code, total_aed, created_at, order_items(product_id, product_name, base_price_aed, quantity, line_total_aed, customizations)";

/** Persist the attempt outcome. Logging the push must itself never throw. */
async function recordPush(args: {
  orderId: string | null;
  orderNumber: string;
  kind: "create" | "status_update";
  endpoint: string;
  result: PosPostResult;
  payload: unknown;
}): Promise<void> {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("pos_push_log").insert({
      order_id: args.orderId,
      order_number: args.orderNumber,
      kind: args.kind,
      endpoint: args.endpoint,
      status: args.result.ok ? "sent" : "failed",
      http_status: args.result.status ?? null,
      attempts: args.result.attempts,
      error: args.result.ok ? null : args.result.error,
      payload: args.payload,
    });
  } catch (e) {
    console.error("[pos] could not write pos_push_log:", e);
  }
}

/**
 * Push a confirmed order to the POS order-create endpoint. DB-sourced and
 * idempotent (POS dedups on order_number). Call after the order is persisted and
 * confirmed (COD: after placement; card: after the paid transition).
 */
export async function pushOrderToPos(orderId: string): Promise<void> {
  if (!HAS_POS || !HAS_SUPABASE_SERVICE) {
    console.info("[pos] disabled (HAS_POS=false); skipping push");
    return;
  }
  try {
    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      console.error("[pos] could not load order for push:", orderId, error);
      return;
    }

    const body = orderRowToWooOrder(order as unknown as PosOrderRow);
    const result = await postToPos(POS_WEBHOOK_URL, body, {
      idempotencyKey: order.order_number,
    });

    await recordPush({
      orderId: order.id,
      orderNumber: order.order_number,
      kind: "create",
      endpoint: POS_WEBHOOK_URL,
      result,
      payload: body,
    });

    if (result.ok) {
      console.info(`[pos] order ${order.order_number} pushed (create)`);
    }
  } catch (e) {
    // Defensive: even an unexpected error here must not propagate to callers.
    console.error("[pos] unexpected error in pushOrderToPos:", orderId, e);
  }
}

/**
 * Push an order status change to the POS order-update endpoint. Best-effort;
 * never blocks the admin action or its customer notifications.
 */
export async function pushOrderStatusToPos(
  orderId: string,
  status: SiteOrderStatus,
): Promise<void> {
  if (!HAS_POS || !HAS_SUPABASE_SERVICE || !POS_PRODUCT_WEBHOOK_URL) {
    console.info("[pos] disabled (missing POS status endpoint); skipping status push");
    return;
  }
  try {
    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, order_number")
      .eq("id", orderId)
      .maybeSingle();

    if (error || !order) {
      console.error(
        "[pos] could not load order for status push:",
        orderId,
        error,
      );
      return;
    }

    const body = statusToWooUpdate(order.order_number, status);
    const result = await postToPos(POS_PRODUCT_WEBHOOK_URL, body, {
      idempotencyKey: `${order.order_number}:${status}`,
    });

    await recordPush({
      orderId: order.id,
      orderNumber: order.order_number,
      kind: "status_update",
      endpoint: POS_PRODUCT_WEBHOOK_URL,
      result,
      payload: body,
    });

    if (result.ok) {
      console.info(
        `[pos] order ${order.order_number} status pushed (${status})`,
      );
    }
  } catch (e) {
    console.error(
      "[pos] unexpected error in pushOrderStatusToPos:",
      orderId,
      e,
    );
  }
}

/**
 * Manual replay helper: re-push order-create rows still in 'failed'. Idempotent
 * via order_number (POS dedups). Not scheduled here — a cron sweep is a
 * fast-follow (spec §11). Returns the number of rows re-attempted.
 */
export async function replayFailedPosPushes(limit = 20): Promise<number> {
  if (!HAS_POS || !HAS_SUPABASE_SERVICE) {
    console.info("[pos] disabled (HAS_POS=false); skipping replay");
    return 0;
  }
  try {
    const supabase = createServiceRoleClient();
    const { data: rows, error } = await supabase
      .from("pos_push_log")
      .select("order_id, kind")
      .eq("status", "failed")
      .eq("kind", "create")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error || !rows || rows.length === 0) return 0;

    let replayed = 0;
    for (const row of rows) {
      if (!row.order_id) continue;
      await pushOrderToPos(row.order_id);
      replayed++;
    }
    return replayed;
  } catch (e) {
    console.error("[pos] replay failed:", e);
    return 0;
  }
}
