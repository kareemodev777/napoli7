import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  notifyKitchenEmail,
  type KitchenNotificationInput,
} from "@/lib/notifications/email";
import { notifyKitchenWhatsApp } from "@/lib/notifications/whatsapp";

interface OrderItemRow {
  product_name: string;
  quantity: number;
  customizations: KitchenNotificationInput["items"][number]["customizations"];
  line_total_aed: number | string;
}

/**
 * Build the kitchen notification from the persisted order and send it.
 *
 * Used by the Stripe webhook so card orders are only sent to the kitchen AFTER
 * payment is confirmed. Reads from the DB (the source of truth) rather than
 * trusting any client-supplied payload. Each channel is isolated so one failing
 * never blocks the other.
 */
export async function sendKitchenNotificationsForOrder(
  orderId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, delivery_type, delivery_address, delivery_slot, pizza_cut, payment_method, total_aed, order_items(product_name, quantity, customizations, line_total_aed)",
    )
    .eq("id", orderId)
    .maybeSingle();

  if (error || !order) {
    console.error(
      "[kitchen] could not load order for notification:",
      orderId,
      error,
    );
    return;
  }

  const payload: KitchenNotificationInput = {
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerPhone: order.customer_phone,
    customerEmail: order.customer_email,
    deliveryType: order.delivery_type as "delivery" | "pickup",
    deliveryAddress: order.delivery_address ?? undefined,
    deliverySlot: order.delivery_slot,
    pizzaCut: Boolean(order.pizza_cut),
    paymentMethod: "card",
    totalAed: Number(order.total_aed),
    items: (order.order_items ?? []).map((it: OrderItemRow) => ({
      name: it.product_name,
      quantity: it.quantity,
      customizations: it.customizations ?? [],
      lineTotalAed: Number(it.line_total_aed),
    })),
  };

  try {
    await notifyKitchenEmail(payload);
  } catch (e) {
    console.error("[kitchen] email failed:", e);
  }
  try {
    await notifyKitchenWhatsApp(payload);
  } catch (e) {
    console.error("[kitchen] whatsapp failed:", e);
  }
}
