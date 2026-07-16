import { Resend } from "resend";
import { HAS_RESEND, ORDER_EMAIL_FROM, ORDER_EMAIL_TO } from "@/lib/env";
import { buildGpsMapsUrl } from "@/lib/delivery-map";
import { isPlaceholderEmail } from "@/lib/auth/placeholder-email";

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
    mapQuery?: string;
    lat?: number;
    lng?: number;
  };
  deliverySlot: string;
  pizzaCut: boolean;
  paymentMethod: "card" | "cod";
  totalAed: number;
  items: OrderItemSummary[];
}

export interface CustomerNotificationInput {
  to: string;
  orderNumber: string;
  status:
    | "received"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
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

interface SendArgs {
  label: string;
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
}

/**
 * Send through Resend and REPORT the outcome. Resend surfaces delivery failures
 * (e.g. an unverified sending domain) in `error` rather than throwing — so we
 * must inspect it, or a rejected send silently looks like success. When Resend
 * isn't configured we log in dev and report not-sent.
 */
async function sendBrandedEmail(args: SendArgs): Promise<EmailSendResult> {
  // A customer who signed up with a phone and no email carries a placeholder
  // address on a reserved TLD. It is not an inbox and never will be. Drop those
  // here, at the one door every email goes through, rather than trusting each
  // caller to remember — they get their updates by SMS instead.
  const recipients = args.to.filter((to) => !isPlaceholderEmail(to));
  if (recipients.length === 0) {
    return { sent: false, reason: "Customer has no email address" };
  }
  if (!HAS_RESEND) {
    console.info(`[${args.label}] Resend disabled. Subject: ${args.subject}`);
    return { sent: false, reason: "Email service not configured" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const { error } = await resend.emails.send({
      from: args.from,
      to: recipients,
      subject: args.subject,
      text: args.text,
      html: args.html,
      ...(args.replyTo ? { replyTo: args.replyTo } : {}),
    });
    if (error) {
      console.error(`[${args.label}] Resend error:`, error);
      return { sent: false, reason: error.message ?? "Resend send failed" };
    }
    return { sent: true };
  } catch (e) {
    console.error(`[${args.label}] send threw:`, e);
    return {
      sent: false,
      reason: e instanceof Error ? e.message : "Email send failed",
    };
  }
}

export async function notifyKitchenEmail(
  input: KitchenNotificationInput,
): Promise<EmailSendResult> {
  const subject = `New order ${input.orderNumber} — ${input.totalAed.toFixed(2)} AED — ${input.paymentMethod.toUpperCase()}`;
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
  const body = `New order received

Order:    ${input.orderNumber}
Customer: ${input.customerName}
Phone:    ${input.customerPhone}
Email:    ${input.customerEmail}
Type:     ${input.deliveryType.toUpperCase()}
Slot:     ${input.deliverySlot}
Pizza:    ${pizzaCutLine}
Payment:  ${input.paymentMethod.toUpperCase()}

Items:
${formatItems(input.items)}

Total:    ${input.totalAed.toFixed(2)} AED

Address:
${address}
${pinText ? `${pinText}
` : ""}`;
  const html = brandEmailHtml({
    eyebrow: "Kitchen order",
    heading: `Order ${input.orderNumber}`,
    intro: `${input.deliveryType === "delivery" ? "Delivery" : "Pickup"} · ${input.totalAed.toFixed(2)} AED · ${input.paymentMethod.toUpperCase()}`,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:22px;">
      ${detailRow("Customer", input.customerName)}
      ${detailRow("Phone", input.customerPhone)}
      ${detailRow("Email", input.customerEmail)}
      ${detailRow("Slot", input.deliverySlot)}
      ${detailRow("Pizza", pizzaCutLine)}
      ${detailRow("Address", address.replaceAll("\n", " · "))}
      ${pinText ? detailRow("Pin", pinText) : ""}
    </table>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${formatItemsHtml(input.items)}</table>
    <div style="margin-top:18px;text-align:right;color:#fff7ed;font-size:18px;font-weight:700;">Total ${input.totalAed.toFixed(2)} AED</div>`,
  });

  return sendBrandedEmail({
    label: "notifyKitchenEmail",
    from: `Napoli 7 Orders <${ORDER_EMAIL_FROM}>`,
    to: [ORDER_EMAIL_TO],
    subject,
    text: body,
    html,
  });
}

export async function notifyCustomerStatusEmail(
  input: CustomerNotificationInput,
): Promise<EmailSendResult> {
  const n = input.orderNumber;
  const copy: Record<
    CustomerNotificationInput["status"],
    { subject: string; heading: string; body: string }
  > = {
    // Unused by the status-email caller (placement sends the richer confirmation
    // email instead), but required so the copy map stays exhaustive over the
    // status union that the phone/SMS confirmation now shares.
    received: {
      subject: `We’ve received your Napoli 7 order ${n}`,
      heading: "Order received",
      body: `We’ve received your order ${n} and will start preparing it shortly.`,
    },
    preparing: {
      subject: `Your Napoli 7 order ${n} is being prepared`,
      heading: "Your order is being prepared",
      body: `Your order ${n} is now being prepared in the Napoli 7 kitchen.`,
    },
    ready: {
      subject: `Your Napoli 7 order ${n} is ready for pickup`,
      heading: "Your order is ready for pickup",
      body: `Your order ${n} is ready — come collect it at Napoli 7. Buon appetito!`,
    },
    out_for_delivery: {
      subject: `Your Napoli 7 order ${n} is on its way`,
      heading: "Your order is on its way",
      body: `Your order ${n} just left the kitchen. Estimated arrival: 30 minutes.`,
    },
    delivered: {
      subject: `Your Napoli 7 order ${n} was delivered`,
      heading: "Your order was delivered",
      body: `Your order ${n} was marked delivered. Thank you for ordering from Napoli 7.`,
    },
    cancelled: {
      subject: `Your Napoli 7 order ${n} was cancelled`,
      heading: "Your order was cancelled",
      body: `Your order ${n} was cancelled. If this is unexpected, please call +971 6 534 5772.`,
    },
  };
  const { subject, heading, body } = copy[input.status];
  const html = brandEmailHtml({
    eyebrow: "Order update",
    heading,
    intro: body,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${detailRow("Order", input.orderNumber)}
      ${detailRow("Status", input.status.replaceAll("_", " ").toUpperCase())}
    </table>`,
  });

  return sendBrandedEmail({
    label: "notifyCustomerStatusEmail",
    from: `Napoli 7 <${ORDER_EMAIL_FROM}>`,
    to: [input.to],
    subject,
    text: body,
    html,
  });
}

export async function notifyStaffAlertEmail(input: {
  subject: string;
  heading: string;
  intro: string;
  details: Array<[string, string]>;
}): Promise<EmailSendResult> {
  const body = [
    input.intro,
    "",
    ...input.details.map(([label, value]) => `${label}: ${value}`),
  ].join("\n");
  const html = brandEmailHtml({
    eyebrow: "Action needed",
    heading: input.heading,
    intro: input.intro,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${input.details.map(([label, value]) => detailRow(label, value)).join("")}
    </table>`,
  });
  return sendBrandedEmail({
    label: "notifyStaffAlertEmail",
    from: `Napoli 7 Alerts <${ORDER_EMAIL_FROM}>`,
    to: [ORDER_EMAIL_TO],
    subject: input.subject,
    text: body,
    html,
  });
}

export async function notifyFreePizzaRewardEmail(input: {
  to: string;
  firstName: string;
  code: string;
  rewardName: string;
  claimNumber: number;
}): Promise<EmailSendResult> {
  const subject = `Your free ${input.rewardName} is reserved — code inside`;
  const intro = `Welcome to Napoli 7, ${input.firstName}. You're claimant #${input.claimNumber} of our free-pizza launch.`;
  const body = `${intro}

Sign in to your Napoli 7 account, then apply this code at checkout to get a free ${input.rewardName}:

  ${input.code}

It works once and is tied to your account, so make sure you're signed in when you order. Buon appetito!`;
  const html = brandEmailHtml({
    eyebrow: "Welcome gift",
    heading: `A free ${input.rewardName} on us`,
    intro,
    children: `<p style="margin:0 0 18px;color:#d8c7b5;font-size:15px;line-height:1.6;"><strong style="color:#fff7ed;">Sign in to your account</strong>, then apply this code at checkout to take a free <strong style="color:#fff7ed;">${escapeHtml(input.rewardName)}</strong> off your order. It works once and is tied to your account.</p>
    <div style="margin:0 0 18px;padding:18px;background:#120f0d;border:1px dashed #d8b27c;border-radius:16px;text-align:center;">
      <div style="font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#9f8f82;">Your code</div>
      <div style="margin-top:8px;font-family:'Courier New',monospace;font-size:26px;letter-spacing:0.12em;color:#f2c98b;">${escapeHtml(input.code)}</div>
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${detailRow("Reward", `Free ${input.rewardName}`)}
      ${detailRow("Claimant", `#${input.claimNumber}`)}
    </table>`,
  });

  return sendBrandedEmail({
    label: "notifyFreePizzaRewardEmail",
    from: `Napoli 7 <${ORDER_EMAIL_FROM}>`,
    to: [input.to],
    subject,
    text: body,
    html,
  });
}

/** Outcome of a best-effort notification send, so callers can record it. */
export interface EmailSendResult {
  sent: boolean;
  reason?: string;
}

export async function notifyContactMessageEmail(input: {
  name: string;
  phone: string;
  email: string;
  message: string;
}): Promise<EmailSendResult> {
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
  return sendBrandedEmail({
    label: "notifyContactMessageEmail",
    from: `Napoli 7 Contact <${ORDER_EMAIL_FROM}>`,
    to: [ORDER_EMAIL_TO],
    subject,
    text: body,
    html,
    replyTo: input.email,
  });
}

/**
 * Order confirmation sent to the CUSTOMER who placed the order (distinct from
 * the kitchen alert). Fires for a placed COD order and for a paid card order.
 */
export async function notifyCustomerOrderConfirmationEmail(input: {
  to: string;
  orderNumber: string;
  deliveryType: "delivery" | "pickup";
  deliverySlot: string;
  paymentMethod: "card" | "cod";
  totalAed: number;
  items: OrderItemSummary[];
}): Promise<EmailSendResult> {
  const isPickup = input.deliveryType === "pickup";
  const estimate = isPickup
    ? "Pickup is usually ready in about 15 minutes."
    : "Estimated delivery: 30–45 minutes.";
  const payLine =
    input.paymentMethod === "cod"
      ? `Pay cash ${isPickup ? "at pickup" : "to the driver on arrival"}.`
      : "Your card payment was received.";
  const subject = `Your Napoli 7 order ${input.orderNumber} is confirmed`;
  const body = `Thank you — your order ${input.orderNumber} is confirmed.

${payLine}
${estimate}

Items:
${formatItems(input.items)}

Total: ${input.totalAed.toFixed(2)} AED

We'll be in touch as your order progresses. Buon appetito!`;
  const html = brandEmailHtml({
    eyebrow: "Order confirmed",
    heading: `Order ${input.orderNumber} confirmed`,
    intro: `${payLine} ${estimate}`,
    children: `<table role="presentation" width="100%" cellspacing="0" cellpadding="0">${formatItemsHtml(input.items)}</table>
    <div style="margin-top:18px;text-align:right;color:#fff7ed;font-size:18px;font-weight:700;">Total ${input.totalAed.toFixed(2)} AED</div>
    <p style="margin:18px 0 0;color:#9f8f82;font-size:13px;">${escapeHtml(input.deliveryType === "delivery" ? "Delivery" : "Pickup")} · Slot: ${escapeHtml(input.deliverySlot)}</p>`,
  });

  return sendBrandedEmail({
    label: "notifyCustomerOrderConfirmationEmail",
    from: `Napoli 7 <${ORDER_EMAIL_FROM}>`,
    to: [input.to],
    subject,
    text: body,
    html,
  });
}
