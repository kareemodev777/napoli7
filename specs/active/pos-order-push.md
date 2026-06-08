# Spec: Push Website Orders to the POS (xtbooks)

## Status: Implemented (flag-gated, off by default)

> Implemented on branch `pos-order-push` (2026-06-08). The §12 open questions
> (POS auth scheme + exact schema/status values) are **not yet confirmed by the
> provider**, so the integration ships **inert**: `HAS_POS` requires both
> `POS_WEBHOOK_URL` and `POS_PUSH_ENABLED=true`, and no live xtbooks endpoint was
> ever called during development. The auth + schema assumptions are the documented
> safe defaults below, isolated in `client.ts` / `payload.ts` for a one-line tweak
> once confirmed. See the Delivery Notes for what shipped and what's verified.

## Objective

When a customer successfully places an order on the Napoli7 website, the order is
**automatically pushed to the Napoli Pizza POS** (xtbooks) over HTTP, so kitchen
staff see web orders in the same system they already use, without manual re-entry.

Concretely:

1. Every **confirmed** order is POSTed to the POS order-create endpoint
   exactly **once**, in a WooCommerce-order-compatible JSON shape.
2. The push fires at the **same trustworthy moment** the kitchen is notified
   today — never before payment is confirmed:
   - **COD**: immediately after the order + items are persisted.
   - **Card**: only after the Stripe `checkout.session.completed` webhook flips
     the order `pending → paid`.
3. The push is **best-effort and non-blocking**: a POS outage never prevents an
   order from being placed, never shows the customer an error, and never blocks
   the existing email/WhatsApp kitchen alerts.
4. Failures are **bounded-retried, logged, and durably recorded** in a
   `pos_push_log` table so they can be inspected and replayed (no silent loss).
5. (Secondary) When an **admin changes an order's status**, that change is pushed
   to the POS order-update endpoint, keeping POS state in sync with the site.
6. The whole integration is **feature-flagged** off until POS env vars are set,
   mirroring the existing `HAS_STRIPE` / `HAS_WHATSAPP` pattern, so it is inert
   in dev/preview and on any environment that hasn't configured it.

### Provided POS endpoints

| Purpose | Endpoint |
|---|---|
| Order create | `https://xtbooks.app/pos/napoli-pizza/public/api/woocommerce/webhook` |
| Product / order **update** | `https://xtbooks.app/pos/napoli-pizza/public/api//woocommerce/product-webhook` |

> Note the double slash (`api//woocommerce`) in the update URL as provided. The
> implementation must use these URLs **as configured via env** (verbatim from the
> POS provider), not hardcoded — see [§12](#12-open-questions--must-confirm-before-build).

## Background

Napoli7 is a Next.js **16.2.4** (App Router, React 19, Turbopack) pizzeria
storefront for Ajman, UAE. Orders persist to **Supabase**; kitchen alerts go out
via **Resend** email and the **WhatsApp Cloud API**. Card payments use **Stripe
Checkout (hosted)** in AED; COD is also supported. Tests run on **`bun test`**.

The POS (xtbooks) exposes WooCommerce-compatible webhook receivers. WooCommerce
is the de-facto integration contract here, so the website plays the role a
WooCommerce store would: it emits a WooCommerce-shaped **order** object on create,
and a WooCommerce-shaped **order update** on status change.

## Current State (verified)

### Order lifecycle and the two fulfillment hook points

The codebase already has a clean separation between "order placed" and "order
confirmed/fulfillable", and already notifies the kitchen at exactly the right
moments. The POS push should attach to those **same** moments.

**COD path** — `src/app/checkout/actions.ts` → `placeOrder()`:
- Validates input (zod), re-prices the cart against live products, re-validates
  the promo, resolves the delivery fee, computes `total`.
- Inserts `orders` (`payment_status: 'pending'`) → returns `id, order_number`
  (`actions.ts:201`).
- Inserts `order_items` (`actions.ts:241`).
- Redeems promo (COD only) (`actions.ts:261`).
- **`runNotifications(...)`** sends kitchen email + WhatsApp (`actions.ts:287`).
- Returns `{ orderId, orderNumber }`.
- ⇒ **POS hook point A**: right after `runNotifications(...)` in the COD branch.

**Card path** — `src/app/api/checkout/stripe-webhook/route.ts` → `POST()`:
- Verifies the Stripe signature (`route.ts:32`).
- On `checkout.session.completed`, performs an **atomic, idempotent**
  `pending → paid` UPDATE that returns a row **only on the first delivery**
  (`route.ts:52-62`). Stripe's at-least-once retries match no row.
- On a real transition, calls **`sendKitchenNotificationsForOrder(orderId)`**
  (`route.ts:75`) and redeems the promo.
- ⇒ **POS hook point B**: inside `if (transitioned && transitioned.length > 0)`,
  right after `sendKitchenNotificationsForOrder(orderId)`.

**Admin status change** — `src/app/admin/orders/actions.ts` → `updateOrderStatus()`:
- `requireAdmin()`, updates `orders.status`, restores promo on cancel, sends
  customer status email + WhatsApp (`actions.ts:62-86`).
- ⇒ **POS hook point C** (secondary): after the status UPDATE succeeds.

### Kitchen-notification pattern to copy

`src/lib/notifications/kitchen.ts` → `sendKitchenNotificationsForOrder(orderId)`
is the model for the POS pusher:
- Reads the **persisted order from the DB** via the **service-role** client
  (`createServiceRoleClient()`), never trusting a client payload (`kitchen.ts:26-33`).
- Selects the order plus nested `order_items(product_name, quantity, customizations, line_total_aed)`.
- Builds a typed payload, then sends each channel inside its own `try/catch` so
  one failure never blocks the other (`kitchen.ts:63-72`).

The POS push should be a **third channel** that follows this same DB-sourced,
isolated, best-effort discipline. Because the webhook path (card) is service-role
and DB-sourced, the COD path should call the **same DB-sourced pusher** (by
`orderId`) rather than re-mapping the client payload — one mapping, one source of
truth.

### Order data model (`supabase/migrations/001_catalog_and_orders.sql`)

`orders`: `id` (uuid), `order_number` (text, e.g. `N7-00001`), `user_id` (nullable),
`customer_name`, `customer_phone` (`+9715…`), `customer_email`,
`delivery_type` (`delivery|pickup`), `delivery_address` (jsonb `{street, area, flat?, notes?}`),
`delivery_slot` (text, e.g. `ASAP`), `order_notes`,
`status` (`received|preparing|out_for_delivery|delivered|cancelled`, default `received`),
`payment_method` (`cod|card`), `payment_status` (`pending|paid|failed|refunded`),
`stripe_session_id`, `stripe_payment_intent`,
`subtotal_aed`, `delivery_fee_aed`, `discount_aed`, `promo_code`, `total_aed`,
`created_at`, `updated_at`.

`order_items`: `order_id`, `product_id`, `product_name`, `base_price_aed`,
`quantity`, `customizations` (jsonb `[{ingredient, choice, extraPrice}]`),
`line_total_aed`.

### Conventions to follow

- **Env**: central `src/lib/env.ts` exposes `HAS_*` booleans + defaulted strings;
  no zod env validation; secrets unprefixed, browser vars `NEXT_PUBLIC_`.
  `.env.example` is committed (names only, no secrets).
- **External calls**: native `fetch`, `runtime = "nodejs"` on routes. Best-effort
  pattern: `if (!res.ok) console.error('[tag] …', res.status, await res.text())`,
  no throw (`whatsapp.ts:118`).
- **Logging**: `console.error/warn/info` with a bracketed `[tag]`; no logger util.
- **Tests**: colocated `*.test.ts`, `bun:test`, pure-function unit tests, no
  network. Run with `bun test`. Test files excluded from `tsc`/eslint.
- **Migrations**: numbered SQL in `supabase/migrations/`; latest is `011_…`.
  New work is `012_pos_push_log.sql`.

## Scope

**In scope**
- Order-create push (COD + card) — the core deliverable.
- A durable `pos_push_log` table + bounded retry + structured logging.
- Admin status-change push to the order-update endpoint (secondary).
- Feature flag + env + `.env.example` + `HAS_POS` in `env.ts`.
- Unit tests for the payload mapper and retry/decision logic.

**Out of scope (note explicitly)**
- Inbound POS → website sync (the `product-webhook` is used here only as an
  **outbound** order-update target; we are not building a receiver for POS pushing
  products/menu into the site).
- A background cron/queue worker for replay. We persist failures and expose a
  manual replay function; an automated retry sweep is a fast-follow
  (see [§11](#11-delivery-notes)).
- Backfilling historical orders.

## Design

### New module: `src/lib/pos/`

```
src/lib/pos/
  client.ts        # postToPos(url, body, {idempotencyKey}) — fetch + retry + auth header
  payload.ts       # pure mappers: orderRowToWooOrder(...) , statusToWooUpdate(...)  ← unit-tested
  push.ts          # pushOrderToPos(orderId) , pushOrderStatusToPos(orderId, status) — DB-sourced
  payload.test.ts  # bun:test unit tests for the mappers (no network)
```

**`payload.ts` (pure, no I/O — the tested core).** Maps a persisted order row +
its items into the WooCommerce order shape (see [§7](#7-payload-mapping)). Pure so
it is unit-testable without DB or network. Also maps `(orderNumber, status)` →
the order-update body.

**`client.ts`.** `postToPos(url, body, { idempotencyKey })`:
- `fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })`.
- Headers: `Content-Type: application/json`, plus the POS auth header
  (name + scheme from env — see [§12](#12-open-questions--must-confirm-before-build)),
  plus an idempotency header keyed on `order_number`.
- Bounded retry: up to **3 attempts** with backoff (e.g. ~300ms, ~1.2s) on
  network error or `5x`/`429`. **No retry** on `4xx` other than `429` (a 4xx is a
  contract problem; retrying won't help — log and record `failed`).
- Returns a discriminated result `{ ok: true, status } | { ok: false, status?, error }`;
  never throws (callers stay best-effort).
- `AbortController` timeout per attempt (~8s) so a hung POS can't wedge the
  serverless function.

**`push.ts` (DB-sourced orchestrators).**
- `pushOrderToPos(orderId)`:
  1. Short-circuit if `!HAS_POS` → `console.info('[pos] disabled …')`, return.
  2. Load order + nested items via `createServiceRoleClient()` (same select as
     `kitchen.ts`, plus the pricing/promo/notes/status fields the mapper needs).
  3. `body = orderRowToWooOrder(order)`.
  4. `result = await postToPos(POS_WEBHOOK_URL, body, { idempotencyKey: order.order_number })`.
  5. Record the attempt in `pos_push_log` (status `sent` or `failed`, response
     code, error text, attempt count).
  6. Return void; log on failure. **Never throw.**
- `pushOrderStatusToPos(orderId, status)`: same shape against
  `POS_PRODUCT_WEBHOOK_URL` with the order-update body.

### Wiring (the three hook points)

**A — COD** (`src/app/checkout/actions.ts`, COD branch ~`:287-295`): after
`runNotifications(...)`, add `void pushOrderToPos(order.id)` (awaited, but its
failure is swallowed inside the function). Place it after `runNotifications` so a
slow POS doesn't delay the existing kitchen alert. Card branch
(`actions.ts:274-284`) is **untouched** — card pushes happen in the webhook.

**B — Card** (`src/app/api/checkout/stripe-webhook/route.ts`, inside
`if (transitioned && transitioned.length > 0)` ~`:73-88`): after
`await sendKitchenNotificationsForOrder(orderId)`, add
`await pushOrderToPos(orderId)`. Guarded by the atomic transition → exactly-once,
matching the kitchen-notify guarantee. **Important:** the POS push must **not**
change the route's HTTP status — it returns `200 ok` regardless, so Stripe does
not retry the whole webhook just because the POS was briefly down (POS retry is
handled internally + via `pos_push_log`).

**C — Admin status** (`src/app/admin/orders/actions.ts`, after the status UPDATE
succeeds ~`:48`, alongside the customer notifications): add
`void pushOrderStatusToPos(parsed.data.orderId, parsed.data.status)`. Best-effort;
never blocks the admin action.

### Demo mode

When `!HAS_SUPABASE` (`actions.ts:177-195`), there is no persisted order to read,
so `pushOrderToPos` cannot run (it is DB-sourced). That's correct: the push is a
no-op in demo mode, and `HAS_POS` will also typically be false there.

## Implementation Steps

1. **Env + flag.** Add to `src/lib/env.ts`:
   ```ts
   export const HAS_POS = Boolean(
     process.env["POS_WEBHOOK_URL"] && process.env["POS_PUSH_ENABLED"] === "true",
   );
   export const POS_WEBHOOK_URL = process.env["POS_WEBHOOK_URL"] ?? "";
   export const POS_PRODUCT_WEBHOOK_URL = process.env["POS_PRODUCT_WEBHOOK_URL"] ?? "";
   ```
   Add the new vars to `.env.example` (names + comments only — see [§9](#9-env-flags)).
2. **Migration** `supabase/migrations/012_pos_push_log.sql` — create `pos_push_log`
   (see [§8](#8-failure--retry--logging)). RLS: service-role only (no client access),
   matching how other server-only writes are gated.
3. **`src/lib/pos/payload.ts`** — pure mappers `orderRowToWooOrder` and
   `statusToWooUpdate`, with explicit TS types for the DB row shape and the Woo body.
4. **`src/lib/pos/payload.test.ts`** — unit tests (see [§10](#10-tests)).
5. **`src/lib/pos/client.ts`** — `postToPos` with retry/backoff/timeout/auth header.
6. **`src/lib/pos/push.ts`** — `pushOrderToPos`, `pushOrderStatusToPos`
   (DB-sourced, `pos_push_log` writes, best-effort).
7. **Wire hook A** in `src/app/checkout/actions.ts` (COD branch only).
8. **Wire hook B** in `src/app/api/checkout/stripe-webhook/route.ts` (after the
   confirmed transition; do not affect the HTTP response).
9. **Wire hook C** in `src/app/admin/orders/actions.ts` (after status update).
10. **Optional manual replay helper** `replayFailedPosPushes(limit)` in `push.ts`
    that re-pushes `pos_push_log` rows still in `failed` (idempotent via
    `order_number`). Not scheduled in this spec.
11. **Verify**: `bun test`, `bun run typecheck`, `bun run lint`, and a local
    end-to-end smoke against a mock POS (see [§10](#10-tests) / [§11](#11-delivery-notes)).

## Acceptance Criteria

- [ ] Placing a **COD** order on the site results in exactly **one** POST to
      `POS_WEBHOOK_URL` with a WooCommerce-shaped body whose totals, line items,
      customer, delivery, and payment fields match the persisted order.
- [ ] Completing a **card** payment results in exactly **one** POST to
      `POS_WEBHOOK_URL`, fired only after `payment_status` becomes `paid`. An
      **abandoned** card checkout produces **zero** POS pushes.
- [ ] Stripe webhook **retries** (duplicate `checkout.session.completed`) produce
      **zero** extra POS pushes (guarded by the existing atomic transition).
- [ ] A POS outage (network error / 5xx / timeout) **does not**: block order
      placement, surface an error to the customer, change the Stripe webhook's
      `200` response, or block email/WhatsApp alerts. The order still persists and
      the kitchen is still alerted.
- [ ] Every push attempt (success or final failure) writes a `pos_push_log` row
      with order id, kind, response status, attempt count, and error text.
- [ ] With `POS_PUSH_ENABLED` unset/false or `POS_WEBHOOK_URL` empty
      (`HAS_POS === false`), **no** POS calls are made anywhere, and all existing
      flows behave exactly as before.
- [ ] An **admin status change** pushes a single order-update to
      `POS_PRODUCT_WEBHOOK_URL`; failure never blocks the status change or its
      customer notifications.
- [ ] `bun test`, `bun run typecheck`, `bun run lint` all pass. Payload mapper has
      direct unit tests covering COD, card, pickup, delivery, promo discount, and
      customizations.
- [ ] No secrets committed; `.env.example` updated with names + guidance only.

## Payload Mapping

The website emits a **WooCommerce order** object. Map our persisted row → Woo
fields as follows. AED is the currency throughout; WooCommerce monetary fields are
**strings** with 2 decimals.

### Order-create body (`orderRowToWooOrder`)

| WooCommerce field | Source (our order) | Notes |
|---|---|---|
| `id` | `order.order_number` | Stable external id the POS keys on (e.g. `N7-00042`). |
| `number` | `order.order_number` | Human-facing number. |
| `status` | derived | `cod` → `"processing"`; card (paid) → `"processing"`. Map our `status` if POS prefers (`received→processing`, `preparing→processing`, `out_for_delivery→on-hold`/custom, `delivered→completed`, `cancelled→cancelled`). Confirm allowed values with POS (§12). |
| `currency` | constant | `"AED"`. |
| `date_created` | `order.created_at` | ISO 8601. |
| `total` | `order.total_aed` | String, 2dp. |
| `payment_method` | `order.payment_method` | `cod` → `"cod"`; card → `"stripe"` (or POS's id). |
| `payment_method_title` | derived | `cod` → `"Cash on Delivery"`; card → `"Credit Card (Stripe)"`. |
| `set_paid` | `order.payment_status === 'paid'` | `true` for paid card, `false` for COD. |
| `transaction_id` | `order.stripe_payment_intent` | card only; omit/`""` for COD. |
| `customer_note` | `order.order_notes` | nullable → `""`. |
| `billing.first_name` / `last_name` | split `customer_name` | first token / remainder. |
| `billing.email` | `customer_email` | |
| `billing.phone` | `customer_phone` | `+9715…`. |
| `billing.address_1` | `delivery_address.street` | delivery only; `""` for pickup. |
| `billing.address_2` | `delivery_address.flat` | optional. |
| `billing.city` | `delivery_address.area` | UAE has no postcode; area → city. |
| `billing.state` / `country` | constants | `state: "Ajman"`, `country: "AE"`. |
| `shipping.*` | mirror `billing.*` | delivery only; empty object/omitted for pickup. |
| `line_items[]` | `order_items[]` | one per row (see below). |
| `shipping_lines[]` | `delivery_fee_aed` | one `flat_rate` line when `> 0` / delivery. |
| `fee_lines[]` or `coupon_lines[]` | `discount_aed`, `promo_code` | represent the discount — prefer `coupon_lines` with `code: promo_code` and `discount: discount_aed` when a code exists; else a negative `fee_line`. Confirm POS support (§12). |
| `meta_data[]` | `delivery_type`, `delivery_slot`, `order_number`, internal `orderId` | key/value pairs for fields with no native Woo home. |

**`line_items[]` per `order_items` row:**

| Woo line field | Source |
|---|---|
| `name` | `product_name` |
| `quantity` | `quantity` |
| `subtotal` / `total` | `line_total_aed` (string, 2dp) |
| `price` | `line_total_aed / quantity` |
| `sku` / `product_id` | `product_id` (sent as `meta_data` if POS can't match our UUID to its catalog) |
| `meta_data[]` | `customizations[]` → one entry per `{ingredient, choice, extraPrice}`, e.g. `{ key: "Extra cheese", value: "extra (+15.00)" }`; `choice: "without"` → `value: "without"`. |

**Example order-create body (card, delivery, with promo + customization):**

```json
{
  "id": "N7-00042",
  "number": "N7-00042",
  "status": "processing",
  "currency": "AED",
  "date_created": "2026-06-08T12:40:00.000Z",
  "total": "126.00",
  "payment_method": "stripe",
  "payment_method_title": "Credit Card (Stripe)",
  "set_paid": true,
  "transaction_id": "pi_3Q…",
  "customer_note": "Well-baked, light cheese",
  "billing": {
    "first_name": "John", "last_name": "Doe",
    "email": "john@example.com", "phone": "+971501234567",
    "address_1": "Sheikh Rashid bin Abdul Aziz St, Building 213",
    "address_2": "202", "city": "Al Jurf", "state": "Ajman", "country": "AE"
  },
  "shipping": {
    "first_name": "John", "last_name": "Doe",
    "address_1": "Sheikh Rashid bin Abdul Aziz St, Building 213",
    "address_2": "202", "city": "Al Jurf", "state": "Ajman", "country": "AE"
  },
  "line_items": [
    {
      "name": "Margherita", "quantity": 2, "price": "55.50",
      "subtotal": "111.00", "total": "111.00",
      "meta_data": [
        { "key": "product_id", "value": "8f1c…" },
        { "key": "Extra cheese", "value": "extra (+15.00)" }
      ]
    }
  ],
  "shipping_lines": [
    { "method_id": "flat_rate", "method_title": "Delivery", "total": "15.00" }
  ],
  "coupon_lines": [
    { "code": "WELCOME10", "discount": "10.00" }
  ],
  "meta_data": [
    { "key": "order_number", "value": "N7-00042" },
    { "key": "order_id", "value": "uuid-…" },
    { "key": "delivery_type", "value": "delivery" },
    { "key": "delivery_slot", "value": "ASAP" }
  ]
}
```

### Order-update body (`statusToWooUpdate`, hook C → product-webhook)

Minimal update keyed on the external order id, carrying the new status:

```json
{
  "id": "N7-00042",
  "number": "N7-00042",
  "status": "completed",
  "meta_data": [{ "key": "order_status", "value": "delivered" }]
}
```

Status map (site → Woo): `received→processing`, `preparing→processing`,
`out_for_delivery→on-hold`(or POS custom), `delivered→completed`,
`cancelled→cancelled`. Final values **must be confirmed** with the POS (§12).

> All status/field mappings above are the **best-known WooCommerce contract** and
> are the parts most likely to need a one-line tweak after the POS provider
> confirms its exact expected schema and auth. They are isolated in `payload.ts`
> precisely so that tweak is trivial and unit-tested.

## Failure / Retry / Logging

**Principle:** the POS push is a **side effect of an already-successful order**.
It must never degrade the customer or admin experience. Order placement, payment
confirmation, and kitchen alerts are the source of truth; the POS is a downstream
consumer that may be temporarily unavailable.

**Retry (in `client.ts`):**
- Up to **3 attempts**; backoff ~300ms then ~1.2s.
- Retry on: network/abort error, HTTP `5xx`, HTTP `429`.
- Do **not** retry on other `4xx` (contract/auth error — record `failed`, log loudly).
- Per-attempt timeout ~8s via `AbortController`.
- Idempotency: send `order_number` as an idempotency header **and** as `id` in the
  body, so POS-side dedup (and our replay) are safe.

**Durable record — `pos_push_log` table** (`012_pos_push_log.sql`):

```sql
create table pos_push_log (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  order_number text not null,
  kind         text not null,           -- 'create' | 'status_update'
  endpoint     text not null,
  status       text not null,           -- 'sent' | 'failed'
  http_status  int,
  attempts     int not null default 1,
  error        text,
  payload      jsonb,                    -- body sent, for replay/debugging
  created_at   timestamptz not null default now()
);
create index on pos_push_log (status);
create index on pos_push_log (order_id);
-- RLS: enable; no policies for anon/auth → service-role only (server writes).
```

- One row per push attempt-set (final outcome), including `attempts` used.
- `payload` stored so a failed push can be replayed verbatim.
- Replay: `replayFailedPosPushes(limit)` re-POSTs rows where `status='failed'`;
  idempotent via `order_number`. Manual for now; cron is a fast-follow.

**Logging** (bracket-tag convention, matching the codebase):
- Success: `console.info('[pos] order N7-00042 pushed (create)')` — keep quiet in
  prod; consider gating info logs.
- Retryable failure mid-loop: `console.warn('[pos] push attempt 2 failed', status)`.
- Final failure: `console.error('[pos] push FAILED after 3 attempts', orderNumber, status, body)`.
- Disabled: `console.info('[pos] disabled (HAS_POS=false); skipping push')`.

## Env Flags

Add to `.env.example` (names + comments only — **no secrets, never committed**):

```bash
# POS integration (xtbooks). Pushes confirmed website orders into the POS.
# Leave POS_PUSH_ENABLED unset/false to disable entirely (no calls made).
POS_PUSH_ENABLED=
# Order-create endpoint (WooCommerce-compatible):
POS_WEBHOOK_URL=https://xtbooks.app/pos/napoli-pizza/public/api/woocommerce/webhook
# Product / order-update endpoint:
POS_PRODUCT_WEBHOOK_URL=https://xtbooks.app/pos/napoli-pizza/public/api//woocommerce/product-webhook
# Auth — exact header/scheme TBD with POS provider (see spec §12). e.g.:
POS_API_KEY=
# Optional: override the auth header name if the POS expects a custom one.
POS_AUTH_HEADER=
```

Add to `src/lib/env.ts`: `HAS_POS`, `POS_WEBHOOK_URL`, `POS_PRODUCT_WEBHOOK_URL`
(per [§Implementation Steps](#implementation-steps) step 1). `HAS_POS` requires
**both** a URL and `POS_PUSH_ENABLED === "true"`, so the integration is inert in
dev/preview until explicitly switched on.

On the production host (Netlify per `DEPLOYMENT_GUIDE.md`), set these in the site
env (Production + Deploy Preview as appropriate). Keep `POS_PUSH_ENABLED=false` on
previews unless deliberately testing against a POS sandbox.

## Tests

Framework: **`bun:test`**, colocated, pure-function, no network — matching
`src/lib/payments/amounts.test.ts`.

**`src/lib/pos/payload.test.ts` (primary, deterministic):**
- COD pickup, no promo → `payment_method:"cod"`, `set_paid:false`, no
  `shipping_lines`, billing has no address.
- Card delivery, with promo → `payment_method:"stripe"`, `set_paid:true`,
  `shipping_lines` total = delivery fee, `coupon_lines` carries code + discount,
  `transaction_id` present.
- Line-item mapping: `price === total/quantity`; multiple items → multiple lines.
- Customizations → `meta_data` entries (`extra (+x)`, `without`).
- Totals are 2dp strings; `total` equals
  `subtotal − discount + delivery_fee` (cross-check against the row's `total_aed`).
- `statusToWooUpdate` maps each site status to the expected Woo status.
- Name split edge cases (single name, multi-word last name).

**`src/lib/pos/client.test.ts` (if pure-testable):**
- Decision logic for retry: which `(status|error)` retry vs. record-failed.
  Factor the "should we retry this outcome?" predicate into a pure function so it
  can be tested without real `fetch`.

**Manual / integration smoke (documented in [§11](#11-delivery-notes), not in CI):**
- Run dev with `POS_WEBHOOK_URL` pointed at a local mock (e.g. a throwaway
  endpoint that logs the body). Place a COD order → assert one well-formed POST.
- Use the Stripe CLI (`stripe listen` / `stripe trigger checkout.session.completed`)
  → assert one POST for card, zero for an abandoned session.
- Point `POS_WEBHOOK_URL` at a URL that returns `500` → assert the order still
  places, the customer sees success, and a `pos_push_log` row is `failed`.

Gate commands (all must pass): `bun test`, `bun run typecheck`, `bun run lint`,
`bun run build`.

## Open Questions — must confirm before build

These are the only items that block a correct implementation; everything else is
specified above. The implementation isolates them in `client.ts` (auth) and
`payload.ts` (schema) so resolving them is a small, contained change.

1. **Authentication.** How does the POS authenticate inbound webhooks? Options:
   a shared secret header (name?), a bearer token, an HMAC signature over the body
   (WooCommerce's native `X-WC-Webhook-Signature` is base64 HMAC-SHA256 of the
   payload with a shared secret), or query param / basic auth. This determines the
   header(s) `postToPos` sends and whether we compute an HMAC. **Default
   assumption** if unspecified: a bearer/`X-API-Key` header from `POS_API_KEY`.
2. **Exact expected schema + allowed `status` values.** Is the receiver a literal
   WooCommerce REST `order` object, or a slimmer custom shape? Which order
   `status` strings does it accept (standard Woo `processing/completed/cancelled/on-hold`
   vs. custom)? Does it dedup on `id`/`number` (idempotency), and how should the
   `product-webhook` order-update body be shaped vs. the create body? Confirm the
   double-slash in the update URL is intentional.

Secondary (non-blocking, sensible defaults chosen above): discount representation
(`coupon_lines` vs `fee_lines`), product-id matching (our UUID vs POS SKU),
pickup representation (empty shipping vs a meta flag).

## Delivery Notes

### Delivered (2026-06-08, branch `pos-order-push`)

Implemented with **safe configurable defaults** while the §12 open questions are
still open. No real xtbooks endpoint was called; the integration is gated off.

**What shipped:**
- **Env + flag** (`src/lib/env.ts`): `HAS_POS` (requires `POS_WEBHOOK_URL` **and**
  `POS_PUSH_ENABLED === "true"`), `POS_WEBHOOK_URL`, `POS_PRODUCT_WEBHOOK_URL`.
  `.env.example` updated with names + guidance (no secrets).
- **Migration** `supabase/migrations/012_pos_push_log.sql` — additive `pos_push_log`
  table, two indexes, RLS enabled with no anon/auth policies (service-role only).
  **Not applied** as part of this task (apply via the normal Supabase process).
- **`src/lib/pos/payload.ts`** — pure mappers `orderRowToWooOrder`,
  `statusToWooUpdate` (+ `siteStatusToWoo`, `splitName`), with explicit TS types.
  No I/O. WooCommerce-shaped body, 2dp money strings.
- **`src/lib/pos/client.ts`** — `postToPos` (3 attempts, ~300ms/~1.2s backoff,
  8s per-attempt `AbortController` timeout, retry on network/5xx/429 only, no
  throw, discriminated result). Auth defaults: `POS_API_KEY` → `Authorization:
  Bearer` **plus** `X-API-Key` (or a custom header via `POS_AUTH_HEADER`); no auth
  header when the key is unset. Idempotency key (`order_number`) sent as headers
  and carried as `id` in the body. Retry decision factored into the pure,
  unit-tested `shouldRetry` predicate.
- **`src/lib/pos/push.ts`** — DB-sourced `pushOrderToPos`, `pushOrderStatusToPos`
  (service-role read, build body, POST, write `pos_push_log`, best-effort, never
  throw) + manual `replayFailedPosPushes(limit)`. Short-circuits on `!HAS_POS`.
- **Wiring:** hook A (COD, `checkout/actions.ts` after `runNotifications`),
  hook B (`stripe-webhook/route.ts` inside the atomic paid transition, response
  stays `200`), hook C (`admin/orders/actions.ts` after the status update).
- **Tests** (`bun:test`, pure, no network): `payload.test.ts` (COD pickup, card
  delivery + promo + customizations, line-item price/total, name splits, status
  map, numeric-string coercion) and `client.test.ts` (`shouldRetry` decisions).

**Verification (run 2026-06-08):**
- `bun test` → **95 pass / 0 fail** (29 new POS tests across 2 files).
- `bun run typecheck` (`tsc --noEmit`) → **clean**.
- `bun run lint` (`eslint`) → **clean**.
- `bun run build` → **not run** this pass; safe to run separately.
- Live POS smoke (§10) → **not run** (no provider auth/schema confirmation; flag
  intentionally off). Do this against a mock or POS sandbox before enabling.

**Still required before enabling in production:**
1. Confirm §12.1 (auth scheme) and §12.2 (exact schema + allowed `status` values,
   double-slash update URL, idempotency/dedup behaviour) with the POS provider;
   adjust `client.ts` / `payload.ts` (one-line, unit-tested).
2. Run the §10 manual smoke against a mock/sandbox, then set the production env
   and flip `POS_PUSH_ENABLED=true`. Watch `pos_push_log` for the first orders.

- **Branching/commits:** built on feature branch `pos-order-push`; not committed
  or pushed as part of this task. No secrets committed; update `CHANGELOG.md` when
  committing.
- **Migration safety:** `012_pos_push_log.sql` is additive (new table only) — no
  changes to `orders`/`order_items`. Apply via the project's normal Supabase
  migration process; do not run migrations as part of this planning task.
- **Rollout:** ship with `POS_PUSH_ENABLED=false`, verify the code is inert
  (acceptance criterion), then enable on production once §12 auth/schema are
  confirmed and a sandbox push round-trips. Watch `pos_push_log` for the first
  live orders.
- **Fast-follows (not in this spec):** (1) a scheduled retry sweep
  (`replayFailedPosPushes`) via cron; (2) an admin view of `pos_push_log` for
  visibility/manual replay; (3) inbound POS→site product/menu sync if the business
  wants the POS to own the catalog.
- **Verification before "done":** `bun test`, `bun run typecheck`, `bun run lint`,
  `bun run build`, plus the manual smoke in §10. Note any check that could not be
  run and why.
- **Risk note:** the POS push is intentionally decoupled from order success. The
  one place that must stay decoupled is the Stripe webhook (hook B): its HTTP
  response must remain `200` independent of the POS result, or Stripe will retry
  the entire webhook on POS downtime and the kitchen/promo logic would re-run
  needlessly (the atomic guard prevents double-processing, but avoid the churn).
```