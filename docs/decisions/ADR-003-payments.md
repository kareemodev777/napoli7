# ADR-003: Payment Gateway

**Date:** 2026-04-30
**Status:** Accepted (revised 2026-04-30 — switched from Telr to Stripe per owner preference)

## Context

Napoli 7 operates in Ajman, UAE. Currency is AED. Customers will pay at checkout. The gateway must:
- Accept UAE-issued Visa/Mastercard (the dominant cards in Ajman).
- Support 3DS2 (mandatory for UAE acquiring banks under Central Bank of UAE regulations).
- Provide a hosted payment page or embeddable widget so PCI DSS scope stays minimal.
- Have an Arabic-language flow or at minimum pass through an English UI acceptable for UAE.
- Have reasonable per-transaction fees.

Three options evaluated:

| Option | UAE support | 3DS2 | Setup time | Monthly fee | Dev experience |
|--------|-------------|------|------------|-------------|----------------|
| Stripe | Yes (UAE entity launched 2023; AED native) | Yes | Hours | % only | Excellent DX, first-class Next.js + TypeScript |
| Telr | Yes (Ajman/Dubai) | Yes | 3–5 days | AED 0 (% only) | REST API, hosted page, no SDK |
| Network International | Yes (ENBD group) | Yes | 5–10 days (KYC) | AED 100–300/mo | REST + Hosted, older SDK |

## Decision

**Stripe — with Cash on Delivery (COD) as the v1 fallback.**

Reasoning:

1. Stripe officially launched in the UAE in 2023 with **AED as a native presentment and settlement currency**. Direct settlement to a UAE bank account, no FX conversion loss. (The earlier concern about USD-only settlement is no longer accurate.)
2. Best-in-class developer experience: official `stripe-node` SDK, official `@stripe/stripe-js` + `@stripe/react-stripe-js` for the front end, robust webhooks, idempotency keys, hosted Checkout, and excellent test mode. Cuts integration time substantially.
3. 3DS2 is automatic via Stripe Radar — no extra configuration to satisfy CBUAE rules.
4. Stripe supports Apple Pay and Google Pay out of the box, which lifts conversion on mobile in the UAE significantly.
5. Stripe's hosted Checkout page is PCI SAQ-A compliant — minimal PCI scope for Napoli 7.
6. Owner explicitly chose Stripe.

**Phase boundary**: Phase 3 ships order placement with COD only (no gateway integration). Stripe is integrated in Phase 4 alongside the account/auth system. COD remains available as a permanent option (common in Ajman market).

## Integration Pattern

We use **Stripe Checkout (hosted)** as the default — fewest moving parts, lowest PCI scope, supports Apple Pay / Google Pay automatically. Embedded Elements is available later if we want a same-page checkout.

```ts
// src/app/api/checkout/create-session/route.ts
// POST — creates a Stripe Checkout Session, returns the redirect URL

import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

const bodySchema = z.object({
  orderId: z.string().uuid(),
  amountAed: z.number().positive(),
  customerEmail: z.string().email(),
  items: z.array(z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    unitAmountAed: z.number().positive(),
  })),
})

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json())

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    currency: 'aed',
    customer_email: body.customerEmail,
    line_items: body.items.map(it => ({
      price_data: {
        currency: 'aed',
        product_data: { name: it.name },
        unit_amount: Math.round(it.unitAmountAed * 100), // fils
      },
      quantity: it.qty,
    })),
    metadata: { orderId: body.orderId },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${body.orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?canceled=1`,
  })

  return Response.json({ url: session.url })
}
```

```ts
// src/app/api/checkout/stripe-webhook/route.ts
// Validates signature, then handles events:
// - checkout.session.completed → mark order paid, trigger kitchen notification
// - charge.refunded            → mark order refunded
// - payment_intent.payment_failed → mark order failed

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
})

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch {
    return new Response('invalid signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const orderId = session.metadata?.orderId
    // update orders.payment_status = 'paid', stripe_session_id = session.id
    // enqueue kitchen notification
  }

  return new Response('ok')
}
```

Environment variables required:
```
STRIPE_SECRET_KEY=sk_test_...           # rotate to sk_live_ at launch
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=https://napoli7.com
```

Use `stripe listen --forward-to localhost:3000/api/checkout/stripe-webhook` during local development to forward webhook events.

## Consequences

Positive:
- AED settlement directly to UAE bank account — no FX cost (post-2023 Stripe UAE launch).
- Strong developer ergonomics: typed SDK, hosted Checkout, automatic Apple Pay / Google Pay.
- 3DS2 + Radar fraud protection automatic.
- Test mode is fully functional with no merchant account approval delay — Phase 4 dev work can start immediately.

Negative:
- Stripe takes a slightly higher cut than some local UAE providers in some scenarios. Acceptable trade for DX + speed.
- Live mode requires UAE business KYC documents (trade license, owner ID, bank account). Owner must have these ready by Phase 4.

## Alternatives Considered

- **Telr**: Originally chosen, rejected by owner. Telr remains a viable UAE-native fallback if Stripe approval ever stalls.
- **Network International**: Deferred. Better fit when monthly volume justifies the minimum fee and longer onboarding is acceptable.
- **PayTabs**: Viable UAE alternative; not pursued.

## Kitchen Notification (out of scope here)

Order notification to the kitchen is decoupled from payment — see ADR-004. The `checkout.session.completed` handler triggers the notification pipeline (Resend email in Phase 3, WhatsApp in Phase 4).
