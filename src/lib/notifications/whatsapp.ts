import { HAS_WHATSAPP } from "@/lib/env";
import {
  buildDeliveryMapQuery,
  buildGoogleMapsSearchUrl,
  buildGpsMapsUrl,
} from "@/lib/delivery-map";
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
    case "received":
      return `Napoli 7: we’ve received your order ${input.orderNumber} 🍕 — we’ll start preparing it shortly. Thank you!`;
    case "preparing":
      return `Napoli 7: your order ${input.orderNumber} is now being prepared in the kitchen 🍕`;
    case "ready":
      return `Napoli 7: your order ${input.orderNumber} is ready for pickup 🍕 — come collect it. See you soon!`;
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
): Promise<{ sent: boolean; reason?: string }> {
  const to = toWhatsAppNumber(input.customerPhone ?? "");
  if (!HAS_WHATSAPP) {
    console.info(
      `[notifyCustomerStatusWhatsApp] WhatsApp disabled. Order: ${input.orderNumber} -> ${input.status}`,
    );
    return { sent: false, reason: "WhatsApp is not configured" };
  }
  if (!to) {
    console.warn(
      `[notifyCustomerStatusWhatsApp] no customer phone for order ${input.orderNumber}`,
    );
    return { sent: false, reason: "No phone number" };
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
    return { sent: false, reason: "WhatsApp API rejected the message" };
  }
  return { sent: true };
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

  const address =
    input.deliveryType === "delivery" && input.deliveryAddress
      ? `${input.deliveryAddress.street}, ${input.deliveryAddress.area}${input.deliveryAddress.flat ? `, Flat ${input.deliveryAddress.flat}` : ""}${input.deliveryAddress.notes ? `\nNotes: ${input.deliveryAddress.notes}` : ""}`
      : "Pickup at shop";
  const gpsUrl =
    input.deliveryAddress?.lat != null && input.deliveryAddress?.lng != null
      ? buildGpsMapsUrl(input.deliveryAddress.lat, input.deliveryAddress.lng)
      : null;
  const pinText = gpsUrl
    ? `Pin (GPS): ${gpsUrl}`
    : input.deliveryAddress?.mapQuery
      ? `Pin: ${input.deliveryAddress.mapQuery}`
      : null;
  const pizzaCutLine = input.pizzaCut ? "Pizza cut: yes" : "Pizza cut: no";

  const messageBody = [
    `New order ${input.orderNumber}`,
    `Total ${input.totalAed.toFixed(2)} AED · ${input.paymentMethod.toUpperCase()}`,
    `${input.customerName} · ${input.customerPhone}`,
    `Type: ${input.deliveryType.toUpperCase()} · ${input.deliverySlot}`,
    pizzaCutLine,
    `Address:\n${address}`,
    pinText,

    ...input.items.map((it) => `${it.quantity}× ${it.name}`),
  ]
    .filter(Boolean)
    .join("\n");

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

export interface RiderAssignmentInput {
  riderName: string;
  riderPhone: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryType: "delivery" | "pickup";
  deliveryAddress?: {
    street?: string;
    area?: string;
    flat?: string;
    notes?: string;
    mapQuery?: string;
    lat?: number;
    lng?: number;
  } | null;
  deliverySlot: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAed: number;
  items: { name: string; quantity: number }[];
}

/**
 * The brief a rider receives on assignment: who/where to deliver, what to
 * collect, and a single tappable maps link (GPS pin when present, otherwise a
 * Google Maps search for the typed address). Pure so it can be unit tested.
 */
export function riderAssignmentMessage(input: RiderAssignmentInput): string {
  const addr = input.deliveryAddress;
  const address =
    input.deliveryType === "delivery" && addr
      ? [
          addr.street,
          [addr.flat ? `Flat ${addr.flat}` : null, addr.area]
            .filter(Boolean)
            .join(", "),
          addr.notes ? `Notes: ${addr.notes}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      : "Pickup at shop";

  const mapsUrl =
    addr?.lat != null && addr?.lng != null
      ? buildGpsMapsUrl(addr.lat, addr.lng)
      : addr?.mapQuery
        ? buildGoogleMapsSearchUrl(addr.mapQuery)
        : buildDeliveryMapQuery(addr ?? null)
          ? buildGoogleMapsSearchUrl(buildDeliveryMapQuery(addr ?? null))
          : null;

  // COD orders need the driver to collect cash; prepaid orders should not.
  const payment =
    input.paymentMethod === "cod" || input.paymentStatus !== "paid"
      ? `Collect on delivery: ${input.totalAed.toFixed(2)} AED (${input.paymentMethod.toUpperCase()})`
      : `Paid online — collect nothing (${input.totalAed.toFixed(2)} AED)`;

  return [
    `Delivery assigned to you, ${input.riderName} 🛵`,
    `Order ${input.orderNumber} · ${input.deliverySlot}`,
    `${input.customerName} · ${input.customerPhone}`,
    payment,
    `Address:\n${address}`,
    mapsUrl ? `Map: ${mapsUrl}` : null,
    ...input.items.map((it) => `${it.quantity}× ${it.name}`),
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Send the delivery brief to the assigned rider over WhatsApp. Best-effort like
 * the other channels — never throws — but returns whether the message was sent
 * so the admin UI can surface "WhatsApp not delivered" instead of silently
 * implying the rider was notified.
 */
export async function notifyRiderAssignmentWhatsApp(
  input: RiderAssignmentInput,
): Promise<{ sent: boolean; reason?: string }> {
  const to = toWhatsAppNumber(input.riderPhone ?? "");
  if (!HAS_WHATSAPP) {
    console.info(
      `[notifyRiderAssignmentWhatsApp] WhatsApp disabled. Order ${input.orderNumber} -> ${input.riderName}`,
    );
    return { sent: false, reason: "WhatsApp is not configured" };
  }
  if (!to) {
    console.warn(
      `[notifyRiderAssignmentWhatsApp] no rider phone for order ${input.orderNumber}`,
    );
    return { sent: false, reason: "Rider has no phone number" };
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
        text: { body: riderAssignmentMessage(input) },
      }),
    },
  );
  if (!res.ok) {
    console.error(
      "[notifyRiderAssignmentWhatsApp] WhatsApp API failed:",
      res.status,
      await res.text(),
    );
    return { sent: false, reason: "WhatsApp API rejected the message" };
  }
  return { sent: true };
}
