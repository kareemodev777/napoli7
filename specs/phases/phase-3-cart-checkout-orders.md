# Phase 3 — Cart, Checkout, Order Placement

**Status**: Implemented (2026-05-26)
**Effort**: 3–5 working days
**Gate**: A complete test order can be placed and confirmed (COD only). Owner approves the flow.
**Dependencies**: Phase 2 approved. Supabase project created and env vars set.

---

## Goal

Wire the full order funnel: cart state (Zustand + localStorage), cart page, checkout form (address + contact + delivery time), order placement as a Server Action writing to Supabase, email notification to the kitchen via Resend, and the order confirmation page. Payment is COD only in this phase — no Stripe integration yet. The `/track` public tracker also ships here.

---

## Scope

### In

- Supabase project setup (schema migration, RLS policies from ADR-001 + ADR-002)
- Catalog migration: Supabase-backed reads with Cache Components replacing mock data
- Zustand cart store with localStorage persistence
- Cart icon in Header shows live item count
- `/cart` — line items, customization summary, quantity edits, remove, promo input (UI only, no code logic yet), subtotal, COD note, checkout CTA
- `/checkout` — contact details (name, phone, email), delivery address (street, area, building/flat note), delivery type (deliver/pickup toggle), delivery time slot (ASAP / scheduled), order notes, COD payment selection (only option), place order button
- `placeOrder` Server Action: validates input with Zod, writes to Supabase `orders` + `order_items` tables, sends Resend email notification to kitchen, returns `{ orderId }`
- `/order/[id]/confirmation` — thank-you page: order ID, estimated time, items summary, "Track your order" link
- `/track` — public form (order ID + phone number), queries Supabase for matching order, shows status timeline
- Loading/error states on all new routes
- Contact form submission (wires Phase 1 form to a Server Action sending email via Resend)

### Out

- Stripe payment integration (Phase 4)
- Auth / login-gated account (Phase 4)
- Promo code validation logic (Phase 5)
- WhatsApp kitchen notification (Phase 5)
- Admin order management (Phase 5)

---

## User Stories

### US-3.1 Add to cart
**As** a customer on a product detail page,
**I want** "ADD TO CART" to add the item with my customizations to a persistent cart,
**so that** I can continue browsing and my selections are not lost.

Acceptance criteria:
- [ ] Clicking "ADD TO CART" on `/menu/[slug]` adds the item to the Zustand cart store.
- [ ] Cart icon in Header immediately updates to show new item count (e.g. "2").
- [ ] Cart persists across page reloads (localStorage).
- [ ] Adding the same product with the same customizations increments quantity; different customizations creates a new line item.
- [ ] "Added" confirmation state shows on the button for 1.5 seconds, then button resets.

### US-3.2 View and edit cart
**As** a customer on `/cart`,
**I want** to see all my items with their customizations, adjust quantities, and remove items,
**so that** I can confirm my order before checkout.

Acceptance criteria:
- [ ] Each line item shows: product name, italic foreign name if present, customizations summary (e.g. "Without basil · Extra mozzarella +7.00 AED"), quantity stepper, line total, remove button.
- [ ] Quantity stepper changes persist to cart store immediately; line total recalculates.
- [ ] Remove button removes the line item; cart updates without page reload.
- [ ] Subtotal row: sum of all line totals. "29.00 AED" format, tabular.
- [ ] Delivery fee row: "Calculated at checkout" (not yet determined).
- [ ] Empty cart state: "No items yet. Order your first pizza." with "View Menu" CTA.
- [ ] Promo code input: text field + "Apply" ghost button — UI present but no validation logic (shows "Promo codes available soon").
- [ ] "Proceed to Checkout" button: primary navy, full-width. Navigates to `/checkout`.
- [ ] Desktop: 2-column (items 2/3 + summary sticky 1/3). Mobile: stacked.

### US-3.3 Complete checkout
**As** a customer ready to order,
**I want** to enter my contact details, delivery address, and place a COD order,
**so that** I can have my pizza delivered.

Acceptance criteria:
- [ ] Form fields: First name, Last name, Phone (required, UAE format hint "+971..."), Email (required), Area in Ajman (required), Street and building number (required), Flat/apartment (optional), Delivery instructions (optional, textarea).
- [ ] Delivery type toggle: "Deliver" / "Pickup". When Pickup is selected, address fields are hidden.
- [ ] Delivery time: "ASAP" pre-selected. Option to choose a 30-minute time slot up to 2 hours from now (slots generated client-side from current time).
- [ ] Payment section: one option shown — "Cash on Delivery". Selected by default. Note: "Pay cash to the delivery driver on arrival."
- [ ] Order summary sidebar (desktop) / collapsible drawer (mobile): items, subtotal, delivery fee ("TBD — will be confirmed by the kitchen"), total.
- [ ] "PLACE ORDER" button: submits `placeOrder` Server Action.
- [ ] While submitting: button shows loading state "Placing order..." and is disabled.
- [ ] On success: redirect to `/order/[id]/confirmation`.
- [ ] On error: inline error message above the button. Never just "Error." — explain what happened and what to do.
- [ ] All required fields validated client-side before submit. If invalid, focus jumps to first error field.
- [ ] Server-side Zod validation runs in the Server Action — client bypass cannot create invalid orders.

### US-3.4 Order confirmation
**As** a customer who placed an order,
**I want** a confirmation page with my order details and a way to track it,
**so that** I know the order was received.

Acceptance criteria:
- [ ] H1: "Order confirmed." (sentence case — not UPPERCASE per DESIGN.md §9: voice, not a heading-style exception).
- [ ] Order ID shown: "Order #N7-00042" (formatted from UUID short hash).
- [ ] Estimated delivery time: "30–45 minutes" (static copy — dynamic ETA deferred).
- [ ] Items summary: each item with name + price. Total at bottom.
- [ ] "Track your order" link to `/track?orderId=[id]&phone=[phone]` pre-filled.
- [ ] "Back to menu" secondary CTA.
- [ ] Cart is cleared after successful order placement.

### US-3.5 Track order (public)
**As** a customer who placed an order without an account,
**I want** to enter my order ID and phone number to see the current status,
**so that** I know when my pizza is coming.

Acceptance criteria:
- [ ] `/track` renders a form: Order ID field + Phone field + "Track" primary button.
- [ ] On submit: queries Supabase `orders` table where `order_id = :id AND customer_phone = :phone`. No auth required.
- [ ] If found: shows status timeline. Statuses: "Order received" / "Preparing" / "Out for delivery" / "Delivered". Current status highlighted in navy. Past statuses greyed. Future statuses outlined.
- [ ] If not found: "No order found with those details. Check your order ID and phone number."
- [ ] URL params `?orderId=&phone=` pre-fill the form (for link from confirmation page).
- [ ] This is a Server Component with a `<form>` that uses a Server Action — no client JS required for the search.

### US-3.6 Kitchen notification (email)
**As** the kitchen/owner,
**I want** to receive an email the moment an order is placed,
**so that** I can start preparing immediately.

Acceptance criteria:
- [ ] Email sent to `info@napoli7.com` via Resend within 5 seconds of order placement.
- [ ] Email subject: "New order #N7-00042 — 58.00 AED — COD".
- [ ] Email body: customer name, phone, delivery address, all items with customizations, total, payment method, delivery time selection, order notes.
- [ ] If Resend call fails, order write to Supabase has already succeeded — the failure is logged to console but does not cause the Server Action to return an error to the customer.

---

## Routes Added

| Path | File | Type |
|------|------|------|
| `/cart` | `src/app/cart/page.tsx` | Client (cart reads from Zustand) |
| `/checkout` | `src/app/checkout/page.tsx` | Client form + Server Action |
| `/order/[id]/confirmation` | `src/app/order/[id]/confirmation/page.tsx` | Server (reads order from DB) |
| `/track` | `src/app/track/page.tsx` | Server (form + Server Action query) |
| — | `src/app/cart/loading.tsx` | Suspense fallback |
| — | `src/app/checkout/loading.tsx` | Suspense fallback |

---

## Components to Build

| File | Type | Notes |
|------|------|-------|
| `src/store/cart.ts` | Zustand | Full CartStore implementation per ADR-005 types. |
| `src/components/cart/CartLineItem.tsx` | Client | Single cart row with qty stepper + remove. |
| `src/components/cart/CartSummary.tsx` | Client | Sticky sidebar: subtotal, fees, promo, CTA. |
| `src/components/cart/EmptyCart.tsx` | Server | Empty state with View Menu CTA. |
| `src/components/cart/CartIcon.tsx` | Client | ShoppingBag icon + count bubble. Updates from Zustand. Replaces the static one in Header. |
| `src/components/checkout/CheckoutForm.tsx` | Client | Full checkout form with react-hook-form (see note). |
| `src/components/checkout/DeliveryToggle.tsx` | Client | Deliver/Pickup radio toggle, same `.order-toggle` CSS class pattern from Hero. |
| `src/components/checkout/TimeSlotPicker.tsx` | Client | ASAP + dropdown of 30-min slots. |
| `src/components/checkout/OrderSummaryPanel.tsx` | Client | Reads from Zustand. Collapsible on mobile. |
| `src/components/track/TrackForm.tsx` | Server | `<form>` with Server Action. Pre-fills from URL params. |
| `src/components/track/StatusTimeline.tsx` | Server | 4-step status display. |

**Note on react-hook-form**: Not currently in `package.json`. Use native `useState` + `useReducer` for checkout form state to avoid adding a dependency mid-phase. If form complexity warrants it, add `react-hook-form` + `@hookform/resolvers` as a deliberate dependency with a `bun add` call.

### shadcn components to install
```bash
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add select -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add separator -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add alert -y
```

---

## Data Model

### Supabase Schema

```sql
-- Run as a migration in Supabase SQL editor
-- File: supabase/migrations/001_catalog_and_orders.sql

-- (Categories and products tables from ADR-001 already defined)

CREATE TYPE order_status AS ENUM (
  'received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
);

CREATE TYPE delivery_type AS ENUM ('delivery', 'pickup');
CREATE TYPE payment_method AS ENUM ('cod', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      text UNIQUE NOT NULL,       -- "N7-00042"
  user_id           uuid REFERENCES auth.users(id),  -- null for guest
  customer_name     text NOT NULL,
  customer_phone    text NOT NULL,
  customer_email    text NOT NULL,
  delivery_type     delivery_type NOT NULL,
  delivery_address  jsonb,                       -- {street, area, flat, notes}
  delivery_slot     text NOT NULL,               -- "ASAP" or "2026-04-30T14:30"
  order_notes       text,
  status            order_status NOT NULL DEFAULT 'received',
  payment_method    payment_method NOT NULL DEFAULT 'cod',
  payment_status    payment_status NOT NULL DEFAULT 'pending',
  stripe_session_id text,                        -- populated in Phase 4 (Stripe Checkout Session id)
  stripe_payment_intent text,                    -- populated in Phase 4
  subtotal_aed      numeric(8,2) NOT NULL,
  delivery_fee_aed  numeric(6,2) NOT NULL DEFAULT 0,
  total_aed         numeric(8,2) NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL,                -- references products(id) but no FK to allow catalog changes
  product_name    text NOT NULL,                -- snapshot at time of order
  base_price_aed  numeric(8,2) NOT NULL,
  quantity        int NOT NULL CHECK (quantity > 0),
  customizations  jsonb NOT NULL DEFAULT '[]',  -- [{ingredient, choice, extraPrice}]
  line_total_aed  numeric(8,2) NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Auto-increment order number
CREATE SEQUENCE order_number_seq START 1;
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS trigger AS $$
BEGIN
  NEW.order_number := 'N7-' || LPAD(nextval('order_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- Guest orders: readable by anyone who knows the order_id + phone (for /track)
-- Logged-in orders: readable by the owning user
-- Admin: full access
CREATE POLICY "track_guest_order" ON orders
  FOR SELECT USING (true);   -- filtering is done in application layer via server action
CREATE POLICY "own_order_insert" ON orders
  FOR INSERT WITH CHECK (true);  -- anyone can place an order (guest or logged in)
CREATE POLICY "own_order_update_user" ON orders
  FOR UPDATE USING (user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_via_order" ON order_items
  FOR ALL USING (true);   -- access controlled at orders level
```

---

## Server Actions

### `placeOrder`

```ts
// src/app/checkout/actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { notifyKitchenEmail } from '@/lib/notifications/email'
import { redirect } from 'next/navigation'

const deliveryAddressSchema = z.object({
  street: z.string().min(5),
  area: z.string().min(2),
  flat: z.string().optional(),
  notes: z.string().max(200).optional(),
})

const placeOrderSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().regex(/^\+971[0-9]{8,9}$/, 'Enter a valid UAE mobile number starting with +971'),
  email: z.string().email(),
  deliveryType: z.enum(['delivery', 'pickup']),
  deliveryAddress: deliveryAddressSchema.optional(),
  deliverySlot: z.string().min(1),
  orderNotes: z.string().max(500).optional(),
  paymentMethod: z.enum(['cod']),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    basePriceAed: z.number().positive(),
    quantity: z.number().int().min(1).max(20),
    customizations: z.array(z.object({
      ingredient: z.string(),
      choice: z.enum(['default', 'extra', 'without']),
      extraPrice: z.number().min(0),
    })),
    lineTotalAed: z.number().positive(),
  })).min(1),
})

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>

export async function placeOrder(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string; orderId?: string }> {
  const raw = Object.fromEntries(formData)
  const parsed = placeOrderSchema.safeParse({
    ...raw,
    deliveryAddress: raw.deliveryAddress ? JSON.parse(raw.deliveryAddress as string) : undefined,
    items: JSON.parse(raw.items as string),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const subtotal = data.items.reduce((s, i) => s + i.lineTotalAed, 0)
  const deliveryFee = 0  // Phase 3: fee TBD, kitchen confirms manually
  const total = subtotal + deliveryFee

  const supabase = await createClient()
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_name: `${data.firstName} ${data.lastName}`,
      customer_phone: data.phone,
      customer_email: data.email,
      delivery_type: data.deliveryType,
      delivery_address: data.deliveryType === 'delivery' ? data.deliveryAddress : null,
      delivery_slot: data.deliverySlot,
      order_notes: data.orderNotes,
      payment_method: data.paymentMethod,
      subtotal_aed: subtotal,
      delivery_fee_aed: deliveryFee,
      total_aed: total,
    })
    .select('id, order_number')
    .single()

  if (orderError || !order) {
    console.error('Order insert failed:', orderError)
    return { error: 'We could not place your order. Please try again or call us on +971 6 534 5772.' }
  }

  const itemRows = data.items.map(item => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    base_price_aed: item.basePriceAed,
    quantity: item.quantity,
    customizations: item.customizations,
    line_total_aed: item.lineTotalAed,
  }))

  await supabase.from('order_items').insert(itemRows)

  // Notify kitchen — failure does NOT block the order confirmation
  try {
    await notifyKitchenEmail({ ...data, orderId: order.id, orderNumber: order.order_number, total })
  } catch (e) {
    console.error('Kitchen email failed:', e)
  }

  redirect(`/order/${order.id}/confirmation`)
}
```

### `trackOrder`

```ts
// src/app/track/actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const trackSchema = z.object({
  orderId: z.string().min(4),
  phone: z.string().min(8),
})

export async function trackOrder(formData: FormData) {
  const parsed = trackSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Enter a valid order ID and phone number.' }

  const supabase = await createClient()
  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, created_at, delivery_slot, delivery_type')
    .or(`id.eq.${parsed.data.orderId},order_number.ilike.${parsed.data.orderId}`)
    .eq('customer_phone', parsed.data.phone)
    .single()

  if (!order) return { error: 'No order found with those details. Check your order ID and phone number.' }
  return { order }
}
```

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Server-only, never exposed to client
RESEND_API_KEY=
ORDER_EMAIL_TO=info@napoli7.com
ORDER_EMAIL_FROM=orders@napoli7.com
```

---

## Auth Requirements

- `/cart`, `/checkout`, `/track`: public, no auth.
- `/order/[id]/confirmation`: publicly accessible by order ID (no auth check — the UUID is unguessable). In Phase 4, optionally linked to user account.

---

## Cache Strategy

Catalog reads in Phase 3 migrate to Supabase with Cache Components:

```ts
// src/lib/catalog.ts
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getCatalog() {
  'use cache'
  cacheTag('catalog')
  cacheLife('hours')
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('*, customizations:product_customizations(*)')
    .eq('is_active', true)
    .order('position')
  return data ?? []
}
```

Cart, checkout, and orders are never cached — they are always fresh server renders.

---

## Test Plan

### Manual QA checklist
- [ ] Add Margherita to cart from `/menu/margherita-classic`. Cart icon shows "1".
- [ ] Add Diavola Piccante with "Without tomato sauce". Cart shows 2 items.
- [ ] Reload page. Cart still shows 2 items (localStorage persisted).
- [ ] On `/cart`: line items correct, customization summary accurate, subtotal correct.
- [ ] Adjust quantity on Margherita to 2. Subtotal updates immediately.
- [ ] Remove Diavola. One item remains.
- [ ] Navigate to `/checkout`. Form pre-populated with nothing (guest).
- [ ] Submit form with empty required fields. Errors appear inline.
- [ ] Submit form with invalid phone "0501234567". Error: "Enter a valid UAE mobile number starting with +971".
- [ ] Complete valid form, delivery type = Deliver. Click "PLACE ORDER".
- [ ] Supabase `orders` table: 1 new row. `order_items`: 1 new row.
- [ ] Kitchen email received at info@napoli7.com within 10 seconds.
- [ ] Redirect to `/order/[id]/confirmation`. Order number shown.
- [ ] Cart is empty after confirmation.
- [ ] Navigate to `/track`. Enter order number + phone. Order status timeline shows "Order received" as active.
- [ ] `/track` with wrong phone: "No order found" message shown.
- [ ] Pickup flow: toggle "Pickup" on checkout. Address fields hidden. Order placed successfully.
- [ ] `next build` exits 0.
- [ ] `tsc --noEmit` exits 0.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| `/cart` JS bundle delta | < 15KB gzipped (Zustand) |
| `/checkout` LCP | < 2.0s |
| `placeOrder` Server Action response | < 2s (DB write + email) |
| Catalog cache hit ratio | > 99% (Cache Components, 1-hour TTL) |

---

## Accessibility Checklist

- [ ] Checkout form: all inputs have visible labels (12px UPPERCASE per DESIGN.md §6).
- [ ] Required fields marked with asterisk. Asterisk has `aria-hidden="true"`, "required" in screen-reader text or `aria-required="true"`.
- [ ] Error messages linked to inputs via `aria-describedby`.
- [ ] Loading button state: `aria-busy="true"` while submitting.
- [ ] `/track` status timeline: `role="list"`, each step `role="listitem"`. Current step `aria-current="step"`.

---

## Definition of Done

- [ ] Guest can add items, complete checkout (COD), and receive confirmation.
- [ ] Kitchen email received on every test order.
- [ ] Order appears in Supabase `orders` table with correct data.
- [ ] `/track` returns correct status for placed orders.
- [ ] Owner has approved the checkout flow visually.
- [ ] `next build` exits 0.
- [ ] `tsc --noEmit` exits 0.
- [ ] No DESIGN.md bans violated.

---

## Out of Scope / Deferred

- Stripe card payment — Phase 4.
- Account-linked orders — Phase 4.
- Delivery fee calculation — Phase 5 (kitchen confirms manually by phone in v1).
- WhatsApp kitchen notification — Phase 5.
- Promo code validation — Phase 5.
