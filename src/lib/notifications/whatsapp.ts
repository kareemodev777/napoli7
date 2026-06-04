import { HAS_WHATSAPP } from "@/lib/env";
import type {
  CustomerNotificationInput,
  KitchenNotificationInput,
} from "./email";

/** UAE-normalised recipient: digits only, e.164 without the leading +. */
function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Local 0-prefixed UAE mobiles -> 971 country code.
  if (digits.startsWith("0")) return `971${digits.slice(1)}`;
  return digits;
}

/** Customer-facing status message body. Pure so it can be unit tested. */
export function customerStatusMessage(
  input: Omit<CustomerNotificationInput, "to">,
): string {
  switch (input.status) {
    case "out_for_delivery":
      return `Napoli 7: your order ${input.orderNumber} is on its way 🛵 — about 30 minutes.`;
    case "delivered":
      return `Napoli 7: your order ${input.orderNumber} was delivered. Buon appetito! 🍕`;
    case "cancelled":
      return `Napoli 7: your order ${input.orderNumber} was cancelled. If this is unexpected, call +971 6 534 5772.`;
  }
}

/**
 * Send a status update to the customer over WhatsApp. Best-effort: a missing
 * phone or a disabled/erroring API never throws (callers treat it as fire and
 * forget so a notification failure can't block the status change).
 */
export async function notifyCustomerStatusWhatsApp(
  input: Omit<CustomerNotificationInput, "to"> & { customerPhone: string },
) {
  const to = toWhatsAppNumber(input.customerPhone ?? "");
  if (!HAS_WHATSAPP) {
    console.info(
      `[notifyCustomerStatusWhatsApp] WhatsApp disabled. Order: ${input.orderNumber} -> ${input.status}`,
    );
    return;
  }
  if (!to) {
    console.warn(
      `[notifyCustomerStatusWhatsApp] no customer phone for order ${input.orderNumber}`,
    );
    return;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: customerStatusMessage(input) },
      }),
    },
  );
  if (!res.ok) {
    console.error(
      "[notifyCustomerStatusWhatsApp] WhatsApp API failed:",
      res.status,
      await res.text(),
    );
  }
}

export async function notifyKitchenWhatsApp(input: KitchenNotificationInput) {
  if (!HAS_WHATSAPP) {
    console.info(
      `[notifyKitchenWhatsApp] WhatsApp disabled. Order: ${input.orderNumber}`,
    );
    return;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
  const kitchenNumber =
    process.env.KITCHEN_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "971501628577";

  const messageBody = [
    `New order ${input.orderNumber}`,
    `Total ${input.totalAed.toFixed(2)} AED · ${input.paymentMethod.toUpperCase()}`,
    `${input.customerName} · ${input.customerPhone}`,
    `${input.deliveryType.toUpperCase()} · ${input.deliverySlot}`,
    "",
    ...input.items.map((it) => `${it.quantity}× ${it.name}`),
  ].join("\n");

  const res = await fetch(
    `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: kitchenNumber,
        type: "text",
        text: { body: messageBody },
      }),
    },
  );
  if (!res.ok) {
    console.error(
      "[notifyKitchenWhatsApp] WhatsApp API failed:",
      res.status,
      await res.text(),
    );
  }
}
