"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notifyCustomerStatusEmail } from "@/lib/notifications/email";
import {
  notifyCustomerStatusWhatsApp,
  notifyRiderAssignmentWhatsApp,
} from "@/lib/notifications/whatsapp";
import { restorePromoForCancelledOrder } from "@/lib/promo";
import { pushOrderStatusToPos } from "@/lib/pos/push";
import type { OrderStatus } from "@/lib/notifications/status-updates";

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "received",
    "preparing",
    "ready",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
});

export interface UpdateOrderStatusResult {
  error?: string;
  success?: boolean;
  /** The persisted status, so the client can confirm its optimistic value. */
  status?: OrderStatus;
  orderId?: string;
}

export async function updateOrderStatus(
  formData: FormData,
): Promise<UpdateOrderStatusResult> {
  await requireAdmin();
  const parsed = updateStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };

  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.orderId)
    .select("order_number, customer_email, customer_phone")
    .single();

  if (error || !order) {
    return { error: "Update failed. Try again." };
  }

  // Restore any redeemed promo usage on cancellation — exactly once, even if the
  // order is "cancelled" repeatedly (guarded atomically in the RPC).
  if (parsed.data.status === "cancelled") {
    try {
      await restorePromoForCancelledOrder(parsed.data.orderId);
    } catch (e) {
      console.error("[updateOrderStatus] promo restore failed:", e);
    }
  }

  // Customer status notifications. Each channel is isolated and best-effort so a
  // failure never blocks the status change (UC-92, UC-99).
  if (
    parsed.data.status === "preparing" ||
    parsed.data.status === "ready" ||
    parsed.data.status === "out_for_delivery" ||
    parsed.data.status === "delivered" ||
    parsed.data.status === "cancelled"
  ) {
    try {
      await notifyCustomerStatusEmail({
        to: order.customer_email,
        orderNumber: order.order_number,
        status: parsed.data.status,
      });
    } catch (e) {
      console.error("[updateOrderStatus] customer email failed:", e);
    }
    try {
      await notifyCustomerStatusWhatsApp({
        customerPhone: order.customer_phone,
        orderNumber: order.order_number,
        status: parsed.data.status,
      });
    } catch (e) {
      console.error("[updateOrderStatus] customer whatsapp failed:", e);
    }
  }

  // Keep the POS in sync with the site's status. Best-effort and DB-sourced;
  // its failure never blocks the status change or the customer notifications.
  await pushOrderStatusToPos(parsed.data.orderId, parsed.data.status);

  // Refresh every surface that renders this order's status. Track is rendered
  // per-request from search params (no cache tag), so it needs no revalidation.
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/account/orders");

  return {
    success: true,
    status: parsed.data.status,
    orderId: parsed.data.orderId,
  };
}

const assignRiderSchema = z.object({
  orderId: z.string().uuid(),
  // empty string unassigns the order's current rider
  riderId: z.string().uuid().or(z.literal("")),
});

export interface AssignRiderResult {
  error?: string;
  success?: boolean;
  riderId?: string | null;
  riderName?: string | null;
  /** Whether the WhatsApp brief reached the rider (false when skipped/failed). */
  whatsappSent?: boolean;
  /** Why WhatsApp did not send, if it didn't — surfaced to the admin. */
  whatsappReason?: string;
}

/**
 * Assign (or unassign) the rider delivering an order. On assignment the rider is
 * sent the delivery brief over WhatsApp — order details plus a tappable maps
 * link. WhatsApp is best-effort: a failure never blocks the assignment, but the
 * result reports whether it was delivered so the admin isn't misled.
 */
export async function assignRiderToOrder(
  formData: FormData,
): Promise<AssignRiderResult> {
  await requireAdmin();
  const parsed = assignRiderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };
  const { orderId, riderId } = parsed.data;

  const supabase = await createClient();

  // Unassign: clear the rider, no notification.
  if (!riderId) {
    const { error } = await supabase
      .from("orders")
      .update({ assigned_rider_id: null })
      .eq("id", orderId);
    if (error) return { error: "Could not unassign rider. Try again." };
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    return { success: true, riderId: null };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .update({ assigned_rider_id: riderId })
    .eq("id", orderId)
    .select(
      "order_number, customer_name, customer_phone, delivery_type, delivery_address, delivery_slot, payment_method, payment_status, total_aed, order_items(product_name, quantity)",
    )
    .single();

  if (error || !order) {
    return { error: "Assignment failed. Try again." };
  }

  const { data: rider } = await supabase
    .from("riders")
    .select("name, phone")
    .eq("id", riderId)
    .maybeSingle();

  let whatsappSent = false;
  let whatsappReason: string | undefined;
  if (rider) {
    try {
      const address = order.delivery_address as {
        street?: string;
        area?: string;
        flat?: string;
        notes?: string;
        mapQuery?: string;
        lat?: number;
        lng?: number;
      } | null;
      const result = await notifyRiderAssignmentWhatsApp({
        riderName: rider.name,
        riderPhone: rider.phone,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        deliveryType: order.delivery_type,
        deliveryAddress: address,
        deliverySlot: order.delivery_slot,
        paymentMethod: order.payment_method,
        paymentStatus: order.payment_status,
        totalAed: Number(order.total_aed),
        items: (order.order_items ?? []).map(
          (it: { product_name: string; quantity: number }) => ({
            name: it.product_name,
            quantity: it.quantity,
          }),
        ),
      });
      whatsappSent = result.sent;
      whatsappReason = result.reason;
    } catch (e) {
      console.error("[assignRiderToOrder] rider whatsapp failed:", e);
      whatsappReason = "WhatsApp send errored";
    }
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    success: true,
    riderId,
    riderName: rider?.name ?? null,
    whatsappSent,
    whatsappReason,
  };
}
