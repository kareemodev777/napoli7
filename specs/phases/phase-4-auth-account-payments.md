# Phase 4 — Auth, Account, and Payments

**Effort**: 3–4 working days
**Gate**: A logged-in customer can view their order history and pay by card via Stripe Checkout. Owner approves.
**Dependencies**: Phase 3 complete. Stripe account activated (test mode is enough to start; live mode requires UAE business KYC). Supabase Auth configured.

---

## Goal

Add Supabase Auth (email/password + magic link), the full customer account flow, and Stripe card payments via Stripe Checkout (hosted). Guest checkout from Phase 3 remains intact — auth is additive, never mandatory. Customers who register get persistent order history, saved addresses, and wishlist. The kitchen WhatsApp notification is wired here too.

---

## Scope

### In

- `src/proxy.ts` — Supabase session refresh (replaces deprecated `middleware.ts` pattern)
- `/login` — email + password form + "Send magic link" option
- `/register` — name + email + password form
- Supabase Auth email confirmation flow (magic link lands on `/login?confirmed=true`)
- `/account` — dashboard: greeting, recent orders summary, quick links
- `/account/orders` — full order history, paginated (10/page)
- `/account/addresses` — saved addresses (CRUD)
- `/account/wishlist` — saved products (add/remove from product card)
- `saved_addresses` and `wishlists` Supabase tables
- Header: "Login" button shows when no session; "Account" icon when session active
- Stripe payment integration: "Pay by card" option added to checkout alongside COD
- Stripe Checkout hosted payment page (auto-includes Apple Pay + Google Pay in supported browsers)
- `/api/checkout/create-session` server route — creates a Stripe Checkout Session
- `/api/checkout/stripe-webhook` route handler — verifies signature, updates order on `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
- WhatsApp Business Cloud API kitchen notification (supplementing Resend email from Phase 3)
- `src/proxy.ts` session cookie refresh

### Out

- Admin role / kitchen panel (Phase 5)
- Social login (deferred — not needed for v1 UAE audience)
- Password reset UI (Supabase handles via email — link in login page sufficient)
- Loyalty / points (Phase 6)

---

## User Stories

### US-4.1 Register
**As** a new customer,
**I want** to create an account with my email and password,
**so that** my orders are saved to my profile.

Acceptance criteria:
- [ ] `/register` form: First name, Last name, Email, Password (min 8 chars), Confirm password.
- [ ] On success: Supabase sends confirmation email. Page shows "Check your inbox to confirm your email."
- [ ] If email already registered: "An account with this email already exists. Log in instead." with link.
- [ ] Password fields: both have visibility toggle (eye icon, lucide `<Eye>` / `<EyeOff>`).
- [ ] Form validates client-side before submit (empty fields, password mismatch, weak password).
- [ ] Server Action handles `supabase.auth.signUp()`. Returns error if Supabase rejects.

### US-4.2 Login
**As** a returning customer,
**I want** to log in with email/password or a magic link,
**so that** I can access my account.

Acceptance criteria:
- [ ] `/login` form: Email, Password, "Log in" primary button.
- [ ] "Send magic link instead" link below form. On click: shows email-only form + "Send link" button. On success: "Check your inbox for a sign-in link."
- [ ] On successful password login: redirect to `/account`.
- [ ] On failed login: "Incorrect email or password." Never disclose which is wrong.
- [ ] If arriving at `/login?confirmed=true`: show "Email confirmed. You can now log in."
- [ ] "Forgot password?" link: uses Supabase `resetPasswordForEmail` — shows "Check your inbox for a reset link."
- [ ] After login, the user's pending cart (from localStorage) is retained.

### US-4.3 Account dashboard
**As** a logged-in customer on `/account`,
**I want** to see a summary of my account activity,
**so that** I have a quick overview without navigating sub-pages.

Acceptance criteria:
- [ ] Greeting: "Hello, [First name]." — plain sentence case.
- [ ] Recent orders: last 3 orders as compact rows (order number, date, total, status badge).
- [ ] Quick links: "All orders", "Saved addresses", "Wishlist", "Log out".
- [ ] "Log out" calls `supabase.auth.signOut()` + client router refresh + redirect to `/`.
- [ ] Unauthenticated access to `/account` redirects to `/login?next=/account`.

### US-4.4 Order history
**As** a logged-in customer on `/account/orders`,
**I want** to see all my past orders with their status and items,
**so that** I can track and reference them.

Acceptance criteria:
- [ ] Orders listed newest-first. 10 per page, paginated with "Load more" (not page numbers — simpler for mobile).
- [ ] Each order row: order number, date, items summary (e.g. "Margherita Classic + 1 more"), total, status badge.
- [ ] Status badge colors: "received" = brand-soft bg / navy text; "preparing" = azure-soft / azure-deep; "out_for_delivery" = brand / white; "delivered" = success-soft / success; "cancelled" = error-soft / error.
- [ ] Clicking an order row shows a `<Sheet>` (shadcn drawer from right) with full order detail: items, customizations, address, payment method, timestamps.
- [ ] "Track this order" link inside the sheet goes to `/track?orderId=...&phone=...`.
- [ ] Empty state: "No orders yet. Order your first pizza." with CTA.

### US-4.5 Saved addresses
**As** a logged-in customer on `/account/addresses`,
**I want** to save and manage my delivery addresses,
**so that** checkout pre-fills my address.

Acceptance criteria:
- [ ] Addresses listed as cards: street, area, flat, label (Home / Work / Other).
- [ ] "Add address" opens an inline form (no modal). Fields: Label, Street, Area, Flat/Apt, Notes.
- [ ] Edit and delete actions on each address card.
- [ ] One address can be marked "Default". Default address pre-fills checkout.
- [ ] Max 5 saved addresses.

### US-4.6 Wishlist
**As** a logged-in customer,
**I want** to save products to a wishlist from the product card or detail page,
**so that** I can quickly add favourites to my next order.

Acceptance criteria:
- [ ] Product card: heart icon (lucide `<Heart>`) top-left of image. Filled navy when wishlisted, outline otherwise.
- [ ] Clicking the heart while logged in: toggles wishlist state via Server Action. Optimistic update.
- [ ] Clicking the heart while logged out: redirect to `/login?next=[current path]`.
- [ ] `/account/wishlist`: grid of wishlisted products (same `<ProductCard>` component). Remove button on each.
- [ ] Empty state: "Nothing saved yet. Browse the menu to add favourites."

### US-4.7 Card payment (Stripe)
**As** a customer at checkout,
**I want** to pay by card through a secure hosted payment page,
**so that** I don't have to pay cash on delivery.

Acceptance criteria:
- [ ] Checkout payment section shows two options: "Cash on Delivery" (default) and "Pay by card".
- [ ] Selecting "Pay by card" and clicking "PLACE ORDER":
  1. Server Action creates the order in Supabase with `payment_status = 'pending'` (idempotent — a retry must not double-write).
  2. Server route `POST /api/checkout/create-session` calls Stripe to create a Checkout Session in `aed`. Stores `stripe_session_id` on the order.
  3. Customer is redirected to `session.url` (Stripe-hosted Checkout page).
- [ ] Apple Pay and Google Pay buttons appear automatically on supported browsers/devices — no extra work required.
- [ ] On success Stripe redirects to `success_url = /order/[id]/confirmation?session_id={CHECKOUT_SESSION_ID}`.
- [ ] On cancel Stripe redirects to `cancel_url = /checkout?canceled=1`. Show: "Your payment was canceled. Try again or choose Cash on Delivery."
- [ ] The webhook (`POST /api/checkout/stripe-webhook`) is the source of truth, not the redirect:
  - Verify signature with `stripe.webhooks.constructEvent` and `STRIPE_WEBHOOK_SECRET`.
  - On `checkout.session.completed`: set `orders.payment_status = 'paid'`, `stripe_payment_intent = session.payment_intent`, then enqueue kitchen notification.
  - On `payment_intent.payment_failed`: set `orders.payment_status = 'failed'`.
  - On `charge.refunded`: set `orders.payment_status = 'refunded'`.
- [ ] The confirmation page re-checks the session via `stripe.checkout.sessions.retrieve` before showing "PAID" — never trust the redirect alone.
- [ ] Test mode: card `4242 4242 4242 4242`, any future expiry, any CVC, any 5-digit ZIP. 3DS test card `4000 0027 6000 3184` to verify 3DS2 challenge flow.
- [ ] During local development the webhook is forwarded with `stripe listen --forward-to localhost:3000/api/checkout/stripe-webhook`. The CLI prints the webhook signing secret — paste it into `.env.local`.

---

## Routes Added

| Path | File | Type |
|------|------|------|
| `/login` | `src/app/login/page.tsx` | Client form + Server Action |
| `/register` | `src/app/register/page.tsx` | Client form + Server Action |
| `/account` | `src/app/account/page.tsx` | Server (auth-gated) |
| `/account/orders` | `src/app/account/orders/page.tsx` | Server (auth-gated) |
| `/account/addresses` | `src/app/account/addresses/page.tsx` | Client (CRUD) + Server Actions |
| `/account/wishlist` | `src/app/account/wishlist/page.tsx` | Server (auth-gated) |
| `/api/checkout/create-session` | `src/app/api/checkout/create-session/route.ts` | Route Handler (POST) |
| `/api/checkout/stripe-webhook` | `src/app/api/checkout/stripe-webhook/route.ts` | Route Handler (POST) |
| — | `src/proxy.ts` | Next.js 16 proxy (session refresh) |

---

## Components to Build

| File | Type | Notes |
|------|------|-------|
| `src/components/auth/LoginForm.tsx` | Client | Email/password + magic link toggle. |
| `src/components/auth/RegisterForm.tsx` | Client | Registration form with password visibility toggle. |
| `src/components/account/AccountNav.tsx` | Server | Left sidebar nav for `/account/*` pages. |
| `src/components/account/OrderRow.tsx` | Server | Compact order row in history list. |
| `src/components/account/OrderDetailSheet.tsx` | Client | shadcn `<Sheet>` with full order detail. |
| `src/components/account/AddressCard.tsx` | Client | Address display + edit/delete actions. |
| `src/components/account/WishlistHeart.tsx` | Client | Heart toggle on product cards. Optimistic update. |
| `src/components/account/StatusBadge.tsx` | Server | Order status badge with correct color per status. |

### shadcn components to install
```bash
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add sheet -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add dialog -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add tabs -y
```

---

## Data Model

### New Tables

```sql
-- Saved addresses
CREATE TABLE saved_addresses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label      text NOT NULL DEFAULT 'Home',
  street     text NOT NULL,
  area       text NOT NULL,
  flat       text,
  notes      text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_addresses" ON saved_addresses
  FOR ALL USING (auth.uid() = user_id);

-- Wishlist
CREATE TABLE wishlists (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_wishlist" ON wishlists
  FOR ALL USING (auth.uid() = user_id);

-- Link logged-in orders to user_id after sign-in
-- (done in placeOrder action if session exists)
```

---

## Proxy (Session Refresh)

```ts
// src/proxy.ts  (Next.js 16 — not middleware.ts)
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session — required to keep token alive
  await supabase.auth.getUser()

  // Protect /account/* routes
  const { data: { user } } = await supabase.auth.getUser()
  if (request.nextUrl.pathname.startsWith('/account') && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/account/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

---

## Stripe Integration

We use **Stripe Checkout (hosted)**. Lowest PCI scope, automatic Apple Pay / Google Pay, native AED settlement. Embedded Elements is available later if a same-page checkout is wanted.

### Server client

```ts
// src/lib/payments/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
  typescript: true,
})

interface CreateSessionInput {
  orderId: string
  customerEmail: string
  items: Array<{ name: string; qty: number; unitAmountAed: number }>
}

export async function createCheckoutSession(input: CreateSessionInput) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    currency: 'aed',
    customer_email: input.customerEmail,
    line_items: input.items.map((it) => ({
      price_data: {
        currency: 'aed',
        product_data: { name: it.name },
        unit_amount: Math.round(it.unitAmountAed * 100), // fils
      },
      quantity: it.qty,
    })),
    metadata: { orderId: input.orderId },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/${input.orderId}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout?canceled=1`,
  })
  return session
}
```

### Create-session route

```ts
// src/app/api/checkout/create-session/route.ts
import { z } from 'zod'
import { createCheckoutSession } from '@/lib/payments/stripe'
import { createServiceClient } from '@/lib/supabase/service'

const bodySchema = z.object({
  orderId: z.string().uuid(),
  customerEmail: z.string().email(),
  items: z.array(z.object({
    name: z.string(),
    qty: z.number().int().positive(),
    unitAmountAed: z.number().positive(),
  })).min(1),
})

export async function POST(req: Request) {
  const body = bodySchema.parse(await req.json())
  const session = await createCheckoutSession(body)

  // Persist the session id immediately so we can reconcile if the redirect is lost
  const supabase = createServiceClient()
  await supabase
    .from('orders')
    .update({ stripe_session_id: session.id })
    .eq('id', body.orderId)

  return Response.json({ url: session.url })
}
```

### Webhook (source of truth)

```ts
// src/app/api/checkout/stripe-webhook/route.ts
import { stripe } from '@/lib/payments/stripe'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs' // raw body for signature verify

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('missing signature', { status: 400 })

  const body = await req.text()
  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('invalid signature', { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const orderId = session.metadata?.orderId
      if (!orderId) break
      await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          stripe_payment_intent: typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id,
        })
        .eq('id', orderId)
      // Notification fan-out happens in a downstream listener (see ADR-004)
      break
    }
    case 'payment_intent.payment_failed': {
      const pi = event.data.object
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('stripe_payment_intent', pi.id)
      break
    }
    case 'charge.refunded': {
      const charge = event.data.object
      const pi = typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id
      if (!pi) break
      await supabase
        .from('orders')
        .update({ payment_status: 'refunded' })
        .eq('stripe_payment_intent', pi)
      break
    }
  }

  return new Response('ok')
}
```

### Environment variables

```
STRIPE_SECRET_KEY=sk_test_...           # rotate to sk_live_ at launch
STRIPE_WEBHOOK_SECRET=whsec_...         # from `stripe listen` locally; from Dashboard → Webhooks in prod
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_SITE_URL=https://napoli7.com
```

### Local development

```bash
# Forward webhook events to localhost
bun add -d @stripe/stripe-js stripe
brew install stripe/stripe-cli/stripe   # one time
stripe login
stripe listen --forward-to localhost:3000/api/checkout/stripe-webhook
# CLI prints whsec_... — paste into .env.local as STRIPE_WEBHOOK_SECRET
```

---

## WhatsApp Notification

Wire `notifyKitchenWhatsApp` from ADR-004 into the `placeOrder` Server Action alongside `notifyKitchenEmail`. Submit Meta template approval request for `new_order_kitchen` before Phase 4 begins (approval takes 24–48 hours).

```ts
// src/app/checkout/actions.ts (updated in Phase 4)
try { await notifyKitchenWhatsApp(orderSummary) } catch (e) { console.error('WhatsApp notify failed:', e) }
try { await notifyKitchenEmail(orderSummary) } catch (e) { console.error('Email notify failed:', e) }
```

Both failures are non-blocking.

---

## Auth Requirements

| Route | Auth | Rule |
|-------|------|------|
| `/login`, `/register` | None | Redirect to `/account` if already logged in |
| `/account/*` | Required | `proxy.ts` redirects to `/login?next=...` |
| `/api/checkout/create-session` | None | Public endpoint — body validated by Zod and `orderId` must already exist in DB |
| `/api/checkout/stripe-webhook` | None | Verified by Stripe signature (`STRIPE_WEBHOOK_SECRET`) |
| All other routes | None | Unchanged from Phase 3 |

---

## Cache Strategy

No Cache Components for account pages — all are dynamic, user-specific data. Supabase queries run server-side on each request. Catalog remains cached as in Phase 3.

---

## Test Plan

### Manual QA
- [ ] `/register` with new email: confirmation email received, page shows "Check your inbox".
- [ ] Magic link: request sent, link in email, clicking it logs user in, redirects to `/account`.
- [ ] `/account` renders "Hello, [First name]." Unauthenticated access redirects to `/login?next=/account`.
- [ ] `/account/orders` shows orders from Phase 3 test (if customer_email matches).
- [ ] Clicking an order row opens Sheet with full detail.
- [ ] `/account/addresses`: add, edit, delete, set default. Default address pre-fills checkout delivery fields.
- [ ] Wishlist: heart fills on click, product appears in `/account/wishlist`. Unfilling heart removes it.
- [ ] Checkout: "Pay by card" option appears. Selecting it + placing order: redirect to Stripe Checkout.
- [ ] Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC: payment approved. Redirect back to confirmation. Webhook fires → `orders.payment_status = 'paid'`.
- [ ] Stripe 3DS card `4000 0027 6000 3184`: 3DS challenge presented in sandbox; on completion, payment approved.
- [ ] Stripe decline card `4000 0000 0000 9995`: payment declined. Redirect to `/checkout?canceled=1` (or stays on Stripe page until retried). Webhook fires `payment_intent.payment_failed` → `orders.payment_status = 'failed'`.
- [ ] Apple Pay button visible on Safari/iOS. Google Pay button visible on Chrome/Android with a saved card.
- [ ] Webhook signature validation: a curl POST without a signature is rejected with 400.
- [ ] Log out: session cleared, redirect to `/`. Cart retained (localStorage).
- [ ] `next build` exits 0. `tsc --noEmit` exits 0.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| `/login` LCP | < 1.2s |
| `/account/orders` initial load | < 2.0s (server render) |
| `placeOrder` + create Stripe Checkout Session | < 3.0s total |

---

## Accessibility Checklist

- [ ] Password inputs: `type="password"` with visibility toggle. Toggle button: `aria-label="Show password"` / `aria-label="Hide password"`.
- [ ] Order status sheet: focus trapped inside `<Sheet>` while open. Closed by Escape.
- [ ] Account nav: `<nav aria-label="Account navigation">`.
- [ ] Wishlist heart: `aria-label="Add [product name] to wishlist"` / `aria-label="Remove [product name] from wishlist"`.
- [ ] Error messages on auth forms linked via `aria-describedby`.

---

## Definition of Done

- [ ] User can register, confirm email, log in (password and magic link), and log out.
- [ ] Logged-in user sees their order history.
- [ ] Saved addresses pre-fill checkout.
- [ ] Wishlist add/remove works.
- [ ] Stripe Checkout flow completes in test mode: success card → `payment_status = 'paid'`, declined card → `payment_status = 'failed'`, refund (issued from Dashboard) → `payment_status = 'refunded'`.
- [ ] WhatsApp notification sent on order placement (if Meta account approved; Resend as fallback).
- [ ] `next build` exits 0. `tsc --noEmit` exits 0.
- [ ] Owner approves the account flow.

---

## Out of Scope / Deferred

- Admin / kitchen order management panel — Phase 5.
- Social login — deferred.
- Loyalty / points — Phase 6.
- Stripe live mode — owner activates the Stripe account (UAE business KYC: trade license, owner ID, bank account), then test keys (`sk_test_*`, `pk_test_*`) are rotated to live keys (`sk_live_*`, `pk_live_*`) in Vercel. A new live webhook signing secret is configured in the Stripe Dashboard and added to Vercel as `STRIPE_WEBHOOK_SECRET`.
