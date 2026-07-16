import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  notifyKitchenEmail,
  notifyCustomerOrderConfirmationEmail,
  type KitchenNotificationInput,
} from "@/lib/notifications/email";
import { notifyKitchenWhatsApp } from "@/lib/notifications/whatsapp";
import { notifyCustomerStatusPhone } from "@/lib/notifications/phone";

interface OrderItemRow {
  product_name: string;
  quantity: number;
  customizations: KitchenNotificationInput["items"][number]["customizations"];
  line_total_aed: number | string;
  size_label: string | null;
}

/**
 * Build the kitchen notification from the persisted order and send it.
 *
 * Used by the Stripe webhook for card orders and by checkout placement for COD
 * pickup orders. Reads from the DB (the source of truth) rather than trusting
 * any client-supplied payload. Each channel is isolated so one failing never
 * blocks the other.
 */
export async function sendKitchenNotificationsForOrder(
  orderId: string,
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, delivery_type, delivery_address, delivery_slot, pizza_cut, payment_method, total_aed, order_items(product_name, quantity, customizations, line_total_aed, size_label)",
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
    paymentMethod: order.payment_method as "card" | "cod",
    totalAed: Number(order.total_aed),
    items: (order.order_items ?? []).map((it: OrderItemRow) => ({
      name: it.size_label
        ? `${it.product_name} (${it.size_label})`
        : it.product_name,
      quantity: it.quantity,
      customizations: it.customizations ?? [],
      lineTotalAed: Number(it.line_total_aed),
    })),
  };

  // Kitchen email (to the shop). Reports its outcome rather than throwing, so a
  // misconfigured mailer is logged loudly instead of silently swallowed.
  const kitchenEmail = await notifyKitchenEmail(payload).catch((e) => {
    console.error("[kitchen] email threw:", e);
    return { sent: false, reason: "threw" } as const;
  });
  if (!kitchenEmail.sent) {
    console.warn(
      `[kitchen] kitchen email NOT sent for ${order.order_number}: ${kitchenEmail.reason}`,
    );
  }

  try {
    await notifyKitchenWhatsApp(payload);
  } catch (e) {
    console.error("[kitchen] whatsapp failed:", e);
  }

  // Confirmation to the customer who placed the order (distinct from the kitchen
  // alert). Best-effort — never blocks the kitchen notification.
  if (order.customer_email) {
    const customerEmail = await notifyCustomerOrderConfirmationEmail({
      to: order.customer_email,
      orderNumber: order.order_number,
      deliveryType: payload.deliveryType,
      deliverySlot: payload.deliverySlot,
      paymentMethod: payload.paymentMethod,
      totalAed: payload.totalAed,
      items: payload.items,
    }).catch((e) => {
      console.error("[kitchen] customer confirmation threw:", e);
      return { sent: false, reason: "threw" } as const;
    });
    if (!customerEmail.sent) {
      console.warn(
        `[kitchen] customer confirmation NOT sent for ${order.order_number}: ${customerEmail.reason}`,
      );
    }
  }

  // The same confirmation to the customer's phone — WhatsApp if configured, SMS
  // otherwise — so "Order received" arrives by text like every later status does.
  // Without this, placement was email-only and the customer got no received SMS
  // even once SMS was configured. Best-effort; never blocks the order.
  if (order.customer_phone) {
    try {
      const phone = await notifyCustomerStatusPhone({
        customerPhone: order.customer_phone,
        orderNumber: order.order_number,
        status: "received",
      });
      if (!phone.sent) {
        console.warn(
          `[kitchen] customer phone confirmation NOT sent for ${order.order_number}: ${phone.reason}`,
        );
      }
    } catch (e) {
      console.error("[kitchen] customer phone confirmation threw:", e);
    }
  }
}
