import { Resend } from "resend";
import { HAS_RESEND, ORDER_EMAIL_FROM, ORDER_EMAIL_TO } from "@/lib/env";

interface OrderItemSummary {
  name: string;
  quantity: number;
  customizations: { ingredient: string; choice: string; extraPrice: number }[];
  lineTotalAed: number;
}

export interface KitchenNotificationInput {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryType: "delivery" | "pickup";
  deliveryAddress?: {
    street: string;
    area: string;
    flat?: string;
    notes?: string;
  };
  deliverySlot: string;
  paymentMethod: "cod" | "card";
  totalAed: number;
  items: OrderItemSummary[];
}

export interface CustomerNotificationInput {
  to: string;
  orderNumber: string;
  status: "out_for_delivery" | "delivered" | "cancelled";
}

function formatItems(items: OrderItemSummary[]) {
  return items
    .map((it) => {
      const customs = it.customizations.length
        ? "\n    " +
          it.customizations
            .map(
              (c) =>
                `${c.choice} ${c.ingredient}${c.extraPrice ? ` (+${c.extraPrice.toFixed(2)} AED)` : ""}`,
            )
            .join(", ")
        : "";
      return `  • ${it.quantity} × ${it.name} — ${it.lineTotalAed.toFixed(2)} AED${customs}`;
    })
    .join("\n");
}

export async function notifyKitchenEmail(input: KitchenNotificationInput) {
  const subject = `New order ${input.orderNumber} — ${input.totalAed.toFixed(2)} AED — ${input.paymentMethod.toUpperCase()}`;
  const address =
    input.deliveryType === "delivery" && input.deliveryAddress
      ? `${input.deliveryAddress.street}, ${input.deliveryAddress.area}${input.deliveryAddress.flat ? `, Flat ${input.deliveryAddress.flat}` : ""}${input.deliveryAddress.notes ? `\nNotes: ${input.deliveryAddress.notes}` : ""}`
      : "Pickup at shop";
  const body = `New order received

Order:    ${input.orderNumber}
Customer: ${input.customerName}
Phone:    ${input.customerPhone}
Email:    ${input.customerEmail}
Type:     ${input.deliveryType.toUpperCase()}
Slot:     ${input.deliverySlot}
Payment:  ${input.paymentMethod.toUpperCase()}

Items:
${formatItems(input.items)}

Total:    ${input.totalAed.toFixed(2)} AED

Address:
${address}`;

  if (!HAS_RESEND) {
    console.info(
      "[notifyKitchenEmail] Resend disabled. Email payload:\n" + body,
    );
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: `Napoli 7 Orders <${ORDER_EMAIL_FROM}>`,
    to: [ORDER_EMAIL_TO],
    subject,
    text: body,
  });
}

export async function notifyCustomerStatusEmail(
  input: CustomerNotificationInput,
) {
  const subject =
    input.status === "out_for_delivery"
      ? `Your Napoli 7 order ${input.orderNumber} is on its way`
      : input.status === "delivered"
        ? `Your Napoli 7 order ${input.orderNumber} was delivered`
        : `Your Napoli 7 order ${input.orderNumber} was cancelled`;
  const body =
    input.status === "out_for_delivery"
      ? `Your order ${input.orderNumber} just left the kitchen. Estimated arrival: 30 minutes.`
      : input.status === "delivered"
        ? `Your order ${input.orderNumber} was marked delivered. Thank you for ordering from Napoli 7.`
        : `Your order ${input.orderNumber} was cancelled. If this is unexpected, please call +971 6 534 5772.`;

  if (!HAS_RESEND) {
    console.info(
      `[notifyCustomerStatusEmail] Resend disabled. To: ${input.to} :: ${subject}`,
    );
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: `Napoli 7 <${ORDER_EMAIL_FROM}>`,
    to: [input.to],
    subject,
    text: body,
  });
}

export async function notifyContactMessageEmail(input: {
  name: string;
  phone: string;
  email: string;
  message: string;
}) {
  const subject = `New contact form message from ${input.name}`;
  const body = `Name:    ${input.name}\nPhone:   ${input.phone}\nEmail:   ${input.email}\n\nMessage:\n${input.message}`;
  if (!HAS_RESEND) {
    console.info(
      "[notifyContactMessageEmail] Resend disabled. Payload:\n" + body,
    );
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY!);
  await resend.emails.send({
    from: `Napoli 7 Contact <${ORDER_EMAIL_FROM}>`,
    to: [ORDER_EMAIL_TO],
    subject,
    text: body,
    replyTo: input.email,
  });
}
