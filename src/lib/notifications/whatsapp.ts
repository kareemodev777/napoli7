import { HAS_WHATSAPP } from "@/lib/env";
import type { KitchenNotificationInput } from "./email";

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
