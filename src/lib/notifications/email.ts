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
  status: "preparing" | "out_for_delivery" | "delivered" | "cancelled";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function brandEmailHtml({
  eyebrow,
  heading,
  intro,
  children,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
  children: string;
}) {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin:0;background:#0c0a09;font-family:Arial,Helvetica,sans-serif;color:#f8f2e8;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0c0a09;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#171412;border:1px solid #3a2f2a;border-radius:24px;overflow:hidden;">
        <tr>
          <td style="padding:28px;text-align:center;background:linear-gradient(135deg,#1d1714,#2b1713);">
            <div style="font-size:12px;letter-spacing:0.28em;text-transform:uppercase;color:#d8b27c;">${escapeHtml(eyebrow)}</div>
            <h1 style="margin:12px 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;color:#fff7ed;">${escapeHtml(heading)}</h1>
            <p style="margin:0;color:#d8c7b5;font-size:15px;line-height:1.6;">${escapeHtml(intro)}</p>
          </td>
        </tr>
        <tr><td style="padding:28px;">${children}</td></tr>
        <tr>
          <td style="padding:20px 28px;background:#120f0d;border-top:1px solid #2f2823;color:#9f8f82;font-size:12px;line-height:1.6;text-align:center;">
            Napoli 7 · Ajman · Wood-fired pizza, fresh dough, and quick delivery.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

function formatItemsHtml(items: OrderItemSummary[]) {
  return items
    .map((it) => {
      const customs = it.customizations.length
        ? `<div style="margin-top:6px;color:#b8a798;font-size:13px;line-height:1.5;">${it.customizations
            .map(
              (c) =>
                `${escapeHtml(c.choice)} ${escapeHtml(c.ingredient)}${c.extraPrice ? ` (+${c.extraPrice.toFixed(2)} AED)` : ""}`,
            )
            .join(", ")}</div>`
        : "";
      return `<tr>
        <td style="padding:12px 0;border-bottom:1px solid #2f2823;color:#fff7ed;">${it.quantity} × ${escapeHtml(it.name)}${customs}</td>
        <td style="padding:12px 0;border-bottom:1px solid #2f2823;color:#f2c98b;text-align:right;white-space:nowrap;">${it.lineTotalAed.toFixed(2)} AED</td>
      </tr>`;
    })
    .join("");
}

function detailRow(label: string, value: string) {
  return `<tr><td style="padding:6px 0;color:#9f8f82;font-size:13px;">${escapeHtml(label)}</td><td style="padding:6px 0;color:#fff7ed;text-align:right;font-size:13px;">${escapeHtml(value)}</td></tr>`;
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
  const html = brandEmailHtml({
    eyebrow: "Kitchen order",
    heading: `Order ${input.orderNumber}`,
    intro: `${input.deliveryType === "delivery" ? "Delivery" : "Pickup"} · ${input.totalAed.toFixed(2)} AED · ${input.paymentMethod.toUpperCase()}`,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
      ${detailRow("Customer", input.customerName)}
      ${detailRow("Phone", input.customerPhone)}
      ${detailRow("Email", input.customerEmail)}
      ${detailRow("Slot", input.deliverySlot)}
      ${detailRow("Address", address.replaceAll("\n", " · "))}
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${formatItemsHtml(input.items)}</table>
    <div style="margin-top:18px;text-align:right;color:#fff7ed;font-size:18px;font-weight:700;">Total ${input.totalAed.toFixed(2)} AED</div>`,
  });

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
    html,
  });
}

export async function notifyCustomerStatusEmail(
  input: CustomerNotificationInput,
) {
  const subject =
    input.status === "preparing"
      ? `Your Napoli 7 order ${input.orderNumber} is being prepared`
      : input.status === "out_for_delivery"
      ? `Your Napoli 7 order ${input.orderNumber} is on its way`
      : input.status === "delivered"
        ? `Your Napoli 7 order ${input.orderNumber} was delivered`
        : `Your Napoli 7 order ${input.orderNumber} was cancelled`;
  const body =
    input.status === "preparing"
      ? `Your order ${input.orderNumber} is now being prepared in the Napoli 7 kitchen.`
      : input.status === "out_for_delivery"
      ? `Your order ${input.orderNumber} just left the kitchen. Estimated arrival: 30 minutes.`
      : input.status === "delivered"
        ? `Your order ${input.orderNumber} was marked delivered. Thank you for ordering from Napoli 7.`
        : `Your order ${input.orderNumber} was cancelled. If this is unexpected, please call +971 6 534 5772.`;
  const html = brandEmailHtml({
    eyebrow: "Order update",
    heading:
      input.status === "preparing"
        ? "Your order is being prepared"
        : input.status === "out_for_delivery"
        ? "Your order is on its way"
        : input.status === "delivered"
          ? "Your order was delivered"
          : "Your order was cancelled",
    intro: body,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${detailRow("Order", input.orderNumber)}
      ${detailRow("Status", input.status.replaceAll("_", " ").toUpperCase())}
    </table>`,
  });

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
    html,
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
  const html = brandEmailHtml({
    eyebrow: "Contact enquiry",
    heading: `Message from ${input.name}`,
    intro: "A customer sent a message from the Napoli 7 website.",
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:18px;">
      ${detailRow("Name", input.name)}
      ${detailRow("Phone", input.phone)}
      ${detailRow("Email", input.email)}
    </table>
    <div style="background:#120f0d;border:1px solid #2f2823;border-radius:16px;padding:16px;color:#fff7ed;line-height:1.6;white-space:pre-wrap;">${escapeHtml(input.message)}</div>`,
  });
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
    html,
    replyTo: input.email,
  });
}
