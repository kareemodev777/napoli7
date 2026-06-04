"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { notifyCustomerStatusEmail } from "@/lib/notifications/email";
import { notifyCustomerStatusWhatsApp } from "@/lib/notifications/whatsapp";
import { restorePromoForCancelledOrder } from "@/lib/promo";

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum([
    "received",
    "preparing",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ]),
});

export async function updateOrderStatus(formData: FormData) {
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

  revalidatePath("/admin/orders");
  return { success: true };
}
