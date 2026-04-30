# ADR-004: Order Notification (Kitchen Alert)

**Date:** 2026-04-30
**Status:** Accepted

## Context

When a customer places an order, the kitchen (one location, Al Jurf 2, Ajman) must be notified immediately. The owner operates a WhatsApp Business account (+971 50 162 8577) and a regular phone line (+971 6 534 5772). The kitchen does not have a dedicated tablet or POS system in v1.

Requirements:
- Near-instant delivery (< 30 seconds of order placement).
- Must work if the kitchen is offline briefly (no single-point loss).
- Message must include: order ID, customer name, phone, delivery address, line items with customizations, total, payment method.
- Must be operable by a non-technical kitchen worker.

Options evaluated:

| Option | Latency | Reliability | Setup | Cost |
|--------|---------|-------------|-------|------|
| WhatsApp Business API (Meta Cloud API) | < 5s | High | Medium | ~$0.005/msg UAE |
| Twilio SMS | < 5s | High | Low | ~$0.04/msg |
| Email (Resend/Postmark) | < 10s | Medium | Low | ~$0/msg (free tier) |
| Polling admin panel | Depends on refresh | Low | None | Free |

## Decision

**WhatsApp Business Cloud API (Meta) as primary + Resend email as secondary fallback.**

Reasoning:

1. The owner already uses WhatsApp as a primary communication channel (number published on the site). A WhatsApp notification to the kitchen number is the most natural, zero-friction alert — the kitchen worker already has WhatsApp open.
2. WhatsApp Business Cloud API (Meta's hosted version, not a third-party BSP) is the cheapest and most reliable option for UAE-destined messages. UAE is a supported country. Messages sent to an existing WhatsApp Business number are not subject to the "utility" template restrictions once a conversation window is open.
3. Resend email (to info@napoli7.com) as a secondary channel ensures the order is never silently lost even if WhatsApp delivery fails.
4. Twilio SMS was evaluated but WhatsApp is strongly preferred over SMS in the UAE market (WhatsApp penetration > 95% of smartphone users). SMS adds cost with no advantage.
5. A polling admin panel alone (option 4) is insufficient — too dependent on someone actively watching a screen.

**v1 simplification**: WhatsApp requires a Meta Business account + phone number verification. This takes 1–5 business days. The Phase 3 order flow ships with email-only notification (Resend) to unblock the launch. WhatsApp is wired in Phase 5 once the Meta account is approved.

## Message Template (WhatsApp)

WhatsApp requires pre-approved message templates for business-initiated conversations. Template name: `new_order_kitchen`.

```
New order #{{1}} received.

Customer: {{2}} · {{3}}
{{4}}

Items:
{{5}}

Total: {{6}} AED
Payment: {{7}}

Placed at {{8}}
```

Parameters: order_id, customer_name, customer_phone, delivery_address, items_formatted, total, payment_method, placed_at.

## Implementation

```ts
// src/lib/notifications/whatsapp.ts
export async function notifyKitchenWhatsApp(order: OrderSummary) {
  await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: process.env.KITCHEN_WHATSAPP_NUMBER,   // +971501628577
      type: 'template',
      template: { name: 'new_order_kitchen', language: { code: 'en' }, components: [...] },
    }),
  })
}

// src/lib/notifications/email.ts — Resend
export async function notifyKitchenEmail(order: OrderSummary) {
  await resend.emails.send({
    from: 'orders@napoli7.com',
    to: 'info@napoli7.com',
    subject: `New order #${order.id} — ${order.total} AED`,
    html: renderOrderEmail(order),
  })
}
```

Both functions are called from the `placeOrder` Server Action after the DB write succeeds.

Environment variables:
```
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
KITCHEN_WHATSAPP_NUMBER=+971501628577
RESEND_API_KEY=
ORDER_EMAIL_FROM=orders@napoli7.com
```

## Consequences

Positive:
- WhatsApp is the kitchen's native communication channel — zero training required.
- Dual-channel (WhatsApp + email) means a missed notification is extremely unlikely.
- Resend free tier covers hundreds of emails/day.

Negative:
- WhatsApp Cloud API requires a verified Meta Business account — approval takes time.
- Template messages require Meta pre-approval (24–48 hours). Must be submitted before Phase 5.
- If the kitchen WhatsApp number changes, an env var update + redeploy is required.

## Alternatives Considered

- **Twilio SMS**: Adequate fallback if WhatsApp approval stalls. Can be added as a third channel trivially.
- **Polling admin panel only**: Rejected as sole mechanism — too fragile.
- **Push notification to kitchen tablet**: Appropriate at Phase 5+ when an admin/kitchen display is built. Deferred.
