# Spec: Stripe Checkout + Netlify Production Readiness

## Status: Draft

> Planning artifact only. No app code is modified by this document. Implementation
> happens later via `/build` / `/ship` using the Team Orchestration section below.

## Objective

Make Napoli7 safe to take real card payments in production on Netlify:

1. The amount charged in Stripe **exactly equals** the order's authoritative
   total (items − promo discount + delivery fee), in AED.
2. Kitchen / fulfillment notifications for **card** orders fire **only after the
   payment is confirmed paid** (webhook-driven), never on an abandoned checkout.
3. The confirmation page renders honest **payment-status states**
   (paid / processing / failed / refunded / COD) instead of always saying
   "Order confirmed."
4. Stripe session creation is **idempotent** — refreshes/retries don't spawn
   duplicate sessions, and webhook retries don't double-notify the kitchen.
5. All required **env vars** are defined for local dev and Netlify production,
   with a committed `.env.example` (no secrets) and Netlify-side configuration.
6. A committed, correct **Netlify deploy config** for Next.js 16.2.4.
7. A **tests / build / smoke** checklist that gates the deploy.
8. The **Vercel vs Netlify ownership** question is resolved: Netlify is the
   production owner; Vercel is unlinked or demoted to non-prod.

## Background

Napoli7 is a Next.js 16.2.4 (App Router, React 19, Turbopack) pizzeria storefront
for Ajman, UAE. Orders are stored in Supabase; kitchen alerts go out via Resend
email and the WhatsApp Cloud API. Card payments use **Stripe Checkout (hosted)**
in AED. The repo is currently linked to **both** Vercel (`.vercel/`,
`team_64qSbbUoWUPNnzPYlpPKt394`, project `napoli7`) and **Netlify**
(`.netlify/state.json`, site `b26554a5-…`, `napoli7.netlify.app`). The user has
designated Netlify as the intended production owner.

The Stripe + fulfillment plumbing exists but has correctness gaps that make it
unsafe to charge real cards. This spec catalogs those gaps and the path to close
them.

## Current State

### Payment flow (as built)

1. `src/components/checkout/CheckoutForm.tsx` collects the order and calls the
   `placeOrder` server action.
2. `src/app/checkout/actions.ts` → `placeOrder()`:
   - Recomputes `subtotal`, re-validates the promo server-side
     (`validatePromo`), computes `deliveryFee` (`getDeliveryFee`), and
     `total = max(0, subtotal − discount) + deliveryFee`.
   - Inserts `orders` (with `subtotal_aed`, `discount_aed`, `delivery_fee_aed`,
     `total_aed`, `payment_status: 'pending'`) and `order_items`.
   - **Runs `runNotifications()` (kitchen email + WhatsApp) unconditionally for
     BOTH `cod` and `card`, before any payment.**
   - For `card`, returns `paymentUrl = /api/checkout/create-session?orderId=…`;
     the client `window.location.href`-redirects there. For `cod`, redirects
     straight to the confirmation page.
3. `src/app/api/checkout/create-session/route.ts` (GET, `runtime = "nodejs"`):
   - Loads the order + `order_items`, builds Stripe line items from
     `order_items` only (`unitAmountAed = line_total_aed / quantity`), calls
     `createCheckoutSession`, stores `stripe_session_id`, and 303-redirects to
     the Stripe URL.
4. `src/lib/payments/stripe.ts` → `createCheckoutSession()`: AED, card only,
   `success_url = ${SITE_URL}/order/{id}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
   `cancel_url = ${SITE_URL}/checkout?canceled=1`, `metadata.orderId`.
5. `src/app/api/checkout/stripe-webhook/route.ts` (POST, `runtime = "nodejs"`):
   verifies the signature and handles `checkout.session.completed` (→
   `payment_status: 'paid'`), `payment_intent.payment_failed` (→ `'failed'`),
   `charge.refunded` (→ `'refunded'`). **No kitchen notification is sent here.**
6. `src/app/order/[id]/confirmation/page.tsx`: loads the order and **always**
   renders "Order confirmed." It reads `payment_status` into its type but never
   branches on it; `session_id` from the success URL is ignored.

### Supabase schema (relevant)

- `orders` (migration `001`): `payment_method` enum (`cod|card`),
  `payment_status` enum (`pending|paid|failed|refunded`), `stripe_session_id`,
  `stripe_payment_intent`, `subtotal_aed`, `delivery_fee_aed`, `total_aed`,
  `status` (`order_status`, default `received`).
- `007` adds `orders.promo_code` and `orders.discount_aed`; `promo_codes` table +
  atomic `redeem_promo_code(p_code)` RPC.
- `008` adds `delivery_zones` (per-area `fee_aed`).
- There is **no** column/flag recording that fulfillment notifications were sent
  (needed for idempotent webhook-driven notify).

### Env vars referenced in code

`src/lib/env.ts` and call sites reference:
`NEXT_PUBLIC_SITE_URL` (defaults to `https://napoli7.com`), `STRIPE_SECRET_KEY`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ORDER_EMAIL_TO`,
`ORDER_EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
`KITCHEN_WHATSAPP_NUMBER`.

`.env.local` currently contains **only** `NETLIFY_AUTH_TOKEN`,
`SUPABASE_ACCESS_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_PROJECT_REF`. **No Stripe keys, no Resend key, no
`NEXT_PUBLIC_SITE_URL`** → `HAS_STRIPE` is false, so the card path returns
`503` and `SITE_URL` falls back to `https://napoli7.com` (wrong host for the
Netlify deployment).

### Deploy config

- **No committed `netlify.toml` at the repo root.** The only one is the
  generated `.netlify/netlify.toml`, which is **gitignored** (`.gitignore` has
  `.netlify/`), uses an **absolute** publish path
  (`/Users/kareemo/Projects/napoli7/.next`), and `command = "bun run build"`.
  Nothing deploy-related is currently under version control.
- `next.config.ts` pins the Turbopack root to `process.cwd()`.
- No `.github/workflows`, no test framework, no `typecheck` script.

---

## Findings → Required Changes (severity-ranked)

### F1 — CRITICAL: Stripe charge ≠ order total (delivery fee + discount dropped)

`create-session/route.ts` builds line items from `order_items` only. The
**delivery fee is never added** and the **promo discount is never applied**, so:

- Delivery orders are **undercharged** by `delivery_fee_aed`.
- Promo orders are **overcharged** (customer pays full price; discount ignored).
- Per-unit rounding (`line_total_aed / quantity` → `round(unit*100)*qty`) can also
  drift a cent from `line_total_aed` for non-evenly-divisible lines.

**Required:** the Stripe Checkout total must equal `orders.total_aed` exactly.
Build the session from the authoritative order columns, not a re-derivation:

- Product lines from `order_items` (use `line_total_aed` as a single-quantity
  amount, or `unit_amount × qty` only where it reconciles exactly).
- Add a **delivery fee line item** when `delivery_fee_aed > 0`.
- Apply the **discount** via a Stripe one-off coupon
  (`amount_off` in fils, `currency: aed`) attached to the session `discounts`,
  OR fold everything into a single authoritative line item equal to `total_aed`.
  (Decide in T1 — coupon keeps itemization in the Stripe dashboard; single-line
  is simplest and least error-prone. **Recommendation: itemized lines + delivery
  line + coupon for discount.**)
- Add a **server-side guardrail**: assert the computed Stripe amount (sum of
  lines − discounts) equals `round(total_aed * 100)`; if not, refuse to create
  the session and log. This catches future drift.

### F2 — CRITICAL: Kitchen notified before (and without) payment

`placeOrder` notifies the kitchen for card orders **before** the customer ever
reaches Stripe, and the webhook never notifies. Result: kitchen prepares orders
that may never be paid; genuinely-paid card orders rely on the pre-payment alert.

**Required:**

- In `placeOrder`: send kitchen notifications **only for `cod`** orders. For
  `card`, do **not** notify at placement.
- In the webhook `checkout.session.completed` handler: after marking the order
  paid, load the order + items and send the kitchen email + WhatsApp.
- The `HAS_SUPABASE` demo branch in `placeOrder` keeps its current behaviour for
  COD; document that card payments require Stripe + Supabase (already messaged).

### F3 — CRITICAL: Confirmation page ignores payment status

The page always says "Order confirmed." Card payment is confirmed
**asynchronously** by the webhook, so on redirect `payment_status` is frequently
still `pending`. There is no failed/processing/refunded UI.

**Required:** branch the confirmation UI on `payment_method` + `payment_status`:

- `cod` → "Order received — pay cash on delivery."
- `card` + `paid` → "Payment received — order confirmed."
- `card` + `pending` → "Payment processing…" with a lightweight client poll /
  auto-refresh (e.g. revalidate every few seconds for ~30–60s) so the page
  flips to paid once the webhook lands. Optionally do a server-side
  `stripe.checkout.sessions.retrieve(session_id)` (using the `session_id` query
  param already in `success_url`) to read `payment_status` directly as a
  fast-path while the webhook catches up — but the **DB remains the source of
  truth**; never mark fulfillment from the client redirect.
- `card` + `failed` → "Payment failed" with a retry CTA back to `/checkout`.
- `card` + `refunded` → refund notice.
- Keep the existing "order not found" fallback.

### F4 — HIGH: Idempotency (sessions + webhook fulfillment)

- `createCheckoutSession` passes **no `idempotencyKey`**. Add one derived from
  `orderId` (+ a content hash if amounts can change) so retried POSTs don't
  create duplicate sessions/charges.
- `create-session/route.ts` creates a **new** session on every call and never
  reuses the stored `stripe_session_id`. A refresh of the redirect spawns
  multiple open sessions. **Required:** if the order already has an `open`
  session, retrieve and reuse its URL; only create a new one if none exists or
  the prior session is `expired`. Also reject creating a session for an order
  that is already `paid`. Consider switching the route from GET to POST (a GET
  with DB side-effects is prefetch/bot-triggerable).
- **Webhook double-fire:** Stripe delivers at-least-once and retries. Once
  notifications move into the webhook (F2), retries would double-notify.
  **Required:** make the paid transition atomic and notify only on the real
  transition — e.g. `UPDATE orders SET payment_status='paid', paid_at=now()
  WHERE id=? AND payment_status<>'paid' RETURNING id`, and send notifications
  only when a row is returned. This needs a guard column (see F8 migration) or
  equivalent conditional update.

### F5 — HIGH: Env vars (local + Netlify)

**Required:**

- Add a committed **`.env.example`** documenting every variable name (no values):
  `NEXT_PUBLIC_SITE_URL`, `STRIPE_SECRET_KEY`,
  `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ORDER_EMAIL_TO`,
  `ORDER_EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
  `KITCHEN_WHATSAPP_NUMBER`.
- **Local:** add Stripe **test** keys + `STRIPE_WEBHOOK_SECRET` (from
  `stripe listen`), `RESEND_API_KEY` (or leave unset to use the console-log
  fallback), and `NEXT_PUBLIC_SITE_URL=http://localhost:3000` to `.env.local`.
- **Netlify:** set all server secrets in the Netlify site env (Production +
  Deploy Preview scopes). Critically set `NEXT_PUBLIC_SITE_URL` to the real
  deployed origin (`https://napoli7.netlify.app` or the final custom domain) so
  Stripe `success_url`/`cancel_url` don't point at the `napoli7.com` default.
  Keep `STRIPE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` server-only (not
  `NEXT_PUBLIC_`). Never commit real values; do not print secrets in logs.
- Decide test-vs-live Stripe keys for the Netlify production context (live keys
  only once F1–F4 are verified and the Stripe account is approved for live AED
  payments — see Blockers).

### F6 — HIGH: Netlify deploy config for Next.js 16

**Required:**

- Add a committed **root `netlify.toml`** with:
  - `[build] command` (use the same package manager the deploy will run; the
    generated file uses `bun run build` — pick one of bun/npm and make it
    consistent with the lockfile strategy) and **no absolute publish path**
    (let `@netlify/plugin-nextjs` manage the publish dir).
  - `[[plugins]] package = "@netlify/plugin-nextjs"`.
  - `[build.environment] NODE_VERSION` pinned to a Next 16-supported runtime
    (Node 20 LTS minimum; recommend 22 or 24).
- Verify `@netlify/plugin-nextjs` supports Next.js **16.2.4** (see Blockers).
- Confirm API routes (`runtime = "nodejs"`) deploy as Netlify Functions and that
  the webhook can read the **raw request body** for signature verification
  (`req.text()` before parsing — already the case).
- Ensure `.netlify/` stays gitignored (generated) while the new root
  `netlify.toml` is committed.

### F7 — MEDIUM: Vercel vs Netlify ownership

The repo is linked to both platforms. Vercel link
(`team_64qSbbUoWUPNnzPYlpPKt394`, project `napoli7`) most likely originated from
the active Vercel CLI/plugin in this environment auto-linking on a prior command,
not a deliberate production choice. The session also flags the Vercel CLI as
outdated. `package.json` carries `@vercel/analytics` and `@vercel/speed-insights`,
which are **no-ops off Vercel**.

**Required (decisions, then action):**

- Confirm Netlify is the production owner (assumed per user) and that the Netlify
  site `napoli7.netlify.app` is in the **client's** Netlify account/team.
- Audit the Vercel org `team_64qSbbUoWUPNnzPYlpPKt394` — identify whose account/
  team it is and whether anything is actually deployed there. Decide: unlink
  Vercel (remove `.vercel/`, already gitignored) or keep it strictly for preview
  builds, never prod.
- Decide on `@vercel/analytics` / `@vercel/speed-insights`: remove them (dead
  weight on Netlify) or knowingly keep. If keeping analytics on Netlify, choose a
  Netlify-compatible analytics path instead.
- Establish a single production source of truth: **Netlify**.

### F8 — MEDIUM: DB migration for idempotent fulfillment

To support the atomic paid-transition + notify-once guard (F4) cleanly:

**Required:** add migration `009_payment_fulfillment.sql` introducing a guard,
e.g. `orders.paid_at timestamptz` and/or
`orders.kitchen_notified_at timestamptz`, used by the webhook's conditional
update so notifications send exactly once. (If the team prefers not to add
columns, the conditional `WHERE payment_status<>'paid' RETURNING` transition can
serve as the guard, but an explicit `paid_at` is clearer and auditable.)

### F9 — MEDIUM: Tests / build / smoke gate

No tests or CI exist today. **Required** before declaring production-ready:

- Add a `typecheck` script (`tsc --noEmit`) and run `lint` + `build`.
- Add focused unit tests for the **pure** money logic: the Stripe
  amount-builder (must equal `total_aed` across cases: plain, promo %, promo AED,
  delivery fee, pickup, combined) and `computeDiscount` (already pure in
  `promo.ts`).
- Stripe **webhook smoke** via the Stripe CLI: `stripe listen --forward-to
  localhost:3000/api/checkout/stripe-webhook` + `stripe trigger
  checkout.session.completed` / `payment_intent.payment_failed`; assert
  `payment_status` transitions and that kitchen notify fires **once**.
- Manual end-to-end in Stripe **test mode** with card `4242 4242 4242 4242`:
  place a card order with a promo + delivery fee, confirm the amount charged
  equals `total_aed`, confirm kitchen notify fires only after paid, and confirm
  each confirmation-page state renders.

---

## Proposed Changes

### Files to Create

| File | Purpose |
|------|---------|
| `.env.example` | Documents all required env var **names** (no secrets) for local + Netlify. |
| `netlify.toml` (repo root) | Committed Netlify build config: `@netlify/plugin-nextjs`, build command, `NODE_VERSION`. |
| `supabase/migrations/009_payment_fulfillment.sql` | Adds `paid_at` / `kitchen_notified_at` guard column(s) for idempotent webhook fulfillment (F8). |
| `src/lib/payments/__tests__` (or chosen test dir) | Unit tests for the Stripe amount-builder and promo math (F9). |
| `docs/decisions/00X-netlify-as-production-owner.md` | ADR recording the Netlify-vs-Vercel ownership decision (F7). |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/payments/stripe.ts` | Build session from authoritative order total: product lines + delivery-fee line + discount coupon; add `idempotencyKey`; add total-equals-`total_aed` guardrail (F1, F4). |
| `src/app/api/checkout/create-session/route.ts` | Pass delivery fee + discount to the session builder; reuse existing open session / reject paid orders; consider GET→POST (F1, F4). |
| `src/app/api/checkout/stripe-webhook/route.ts` | On `checkout.session.completed`: atomic paid transition + notify kitchen exactly once (email + WhatsApp) (F2, F4). |
| `src/app/checkout/actions.ts` | Notify kitchen only for `cod`; skip pre-payment notify for `card` (F2). |
| `src/app/order/[id]/confirmation/page.tsx` | Render payment-status states (paid/processing/failed/refunded/COD); optional Stripe session fast-path read (F3). |
| `src/lib/env.ts` | (If needed) any helper for the resolved site origin; otherwise unchanged. |
| `.gitignore` | Keep `.netlify/` ignored; ensure committed root `netlify.toml` is not ignored. |
| `package.json` | Add `typecheck` script; resolve `@vercel/*` analytics deps per F7 decision. |

## Implementation Steps

- [ ] **S1.** Refactor the Stripe session builder so the charged total equals
      `orders.total_aed` (product lines + delivery line + discount coupon) with a
      server-side equality guardrail; add `idempotencyKey` (F1, F4).
- [ ] **S2.** Update `create-session` route to pass authoritative amounts, reuse
      an existing open session, reject already-paid orders, and (optionally)
      switch GET→POST (F1, F4).
- [ ] **S3.** Add migration `009` with the fulfillment guard column(s) (F8).
- [ ] **S4.** Move kitchen notifications: COD-only in `placeOrder`; webhook does
      an atomic paid transition then notifies once (F2, F4).
- [ ] **S5.** Rebuild the confirmation page with payment-status states +
      processing poll + optional Stripe session fast-path (F3).
- [ ] **S6.** Add `.env.example`; populate `.env.local` with Stripe test keys +
      webhook secret + `NEXT_PUBLIC_SITE_URL`; configure Netlify env (F5).
- [ ] **S7.** Add committed root `netlify.toml` (plugin, build command, Node
      version); verify Next 16 plugin compatibility (F6).
- [ ] **S8.** Resolve Vercel/Netlify ownership: confirm Netlify owner, audit/
      unlink Vercel, decide on `@vercel/*` deps, write ADR (F7).
- [ ] **S9.** Add `typecheck` script + money unit tests; run lint/typecheck/build
      (F9).
- [ ] **S10.** Stripe CLI webhook smoke + manual test-mode end-to-end across all
      payment states (F9).
- [ ] **S11.** Resolve remaining blockers, then flip Netlify to live Stripe keys
      and register the production webhook endpoint.

## Testing Strategy

- [ ] **Unit:** Stripe amount-builder equals `total_aed` for: no-promo,
      percent-promo, fixed-AED-promo, delivery vs pickup, and promo+delivery
      combined; `computeDiscount` edge cases (min subtotal, expiry, usage cap,
      cap-at-subtotal).
- [ ] **Integration (Stripe test mode + CLI):** `checkout.session.completed`
      marks paid and notifies the kitchen exactly once (retry the event → no
      duplicate notify); `payment_intent.payment_failed` → `failed`;
      `charge.refunded` → `refunded`; bad signature → 400.
- [ ] **Manual:** card `4242…` order with promo + delivery fee — amount charged
      matches `total_aed`; kitchen alert only after paid; each confirmation
      state renders; cancel returns to `/checkout?canceled=1`; COD path
      unchanged.
- [ ] **Build/deploy:** `lint`, `typecheck`, `next build` pass locally; Netlify
      deploy preview builds green; webhook reachable on the deployed domain;
      `NEXT_PUBLIC_SITE_URL` produces correct Stripe redirect URLs.

## Risks & Considerations

- **Charging the wrong amount (F1)** is the highest-impact risk — money/legal.
  Mitigation: equality guardrail + unit tests + manual reconciliation.
- **Double fulfillment / missed fulfillment (F2/F4):** at-least-once webhooks.
  Mitigation: atomic conditional transition + guard column; notify only on real
  transition.
- **Race on confirmation page (F3):** webhook may lag the redirect. Mitigation:
  processing state + poll; DB is source of truth, not the client.
- **Next 16 plugin support (F6):** Next 16.2.4 is bleeding-edge and AGENTS.md
  warns conventions differ from training data. Mitigation: verify
  `@netlify/plugin-nextjs` version against Next 16 docs / a deploy preview before
  trusting prod; read `node_modules/next/dist/docs/` per AGENTS.md.
- **Wrong site origin:** `SITE_URL` defaults to `napoli7.com`; without
  `NEXT_PUBLIC_SITE_URL` set on Netlify, Stripe redirects break. Mitigation: F5.
- **Secret handling:** keep server keys out of `NEXT_PUBLIC_*`, out of git, out
  of logs.
- **Package-manager drift:** repo has `bun.lock`, `deno.lock`, and an npm-style
  lock in the parent. Pick one for the Netlify build command and be consistent.

## Acceptance Criteria

- [ ] Stripe charges exactly `orders.total_aed` (delivery + discount included)
      in every tested scenario; guardrail blocks mismatches.
- [ ] Card kitchen notifications fire only after `checkout.session.completed`,
      exactly once even on webhook retries; COD unchanged.
- [ ] Confirmation page shows correct paid / processing / failed / refunded /
      COD states; processing flips to paid once the webhook lands.
- [ ] Session creation is idempotent (refresh reuses session; paid orders
      rejected); `idempotencyKey` present.
- [ ] `.env.example` committed; `.env.local` and Netlify env fully configured;
      `NEXT_PUBLIC_SITE_URL` correct per environment; no secrets committed.
- [ ] Committed root `netlify.toml` builds a green Netlify deploy preview on
      Next 16.2.4.
- [ ] Vercel/Netlify ownership resolved and recorded (ADR); single prod owner.
- [ ] `lint`, `typecheck`, `build`, unit tests, and webhook smoke all pass.
- [ ] All Blockers below are closed.
- [ ] Code review approved.

## Remaining Blockers (must be answered/closed before live)

1. **Stripe account:** Is the account approved for **live** AED card payments
   (business verification complete)? Which test/live key pair to use on Netlify?
2. **Production domain:** Final origin for `NEXT_PUBLIC_SITE_URL` —
   `napoli7.netlify.app` or a custom `napoli7.com`/`.ae` domain? Affects Stripe
   redirect URLs and the webhook endpoint registration.
3. **Webhook registration:** The Stripe Dashboard webhook endpoint must point at
   the deployed `…/api/checkout/stripe-webhook` and its signing secret must be
   set as `STRIPE_WEBHOOK_SECRET` on Netlify.
4. **Netlify plugin compatibility:** Confirm `@netlify/plugin-nextjs` supports
   Next.js 16.2.4 (verify via deploy preview).
5. **Account ownership:** Confirm the Netlify site and the Vercel team are in the
   correct (client) accounts; decide Vercel's fate.
6. **Discount mechanism:** Final call on Stripe coupon vs single combined line
   item for the discount (dashboard reporting vs simplicity).
7. **Package manager** for the Netlify build (bun vs npm) and lockfile policy.
8. **Resend/WhatsApp:** Verified sender domain for `ORDER_EMAIL_FROM` and a live
   WhatsApp Cloud API token/number, or accept the console-log fallback for
   launch.

---

## Team Orchestration

### Team Members

| Agent | Role | Scope |
|-------|------|-------|
| builder-1 | Builder | Payments correctness: Stripe amount builder, create-session route, idempotency, confirmation-page states. |
| builder-2 | Builder | Fulfillment + infra: webhook notify, `placeOrder` gating, DB migration, env/`.env.example`, `netlify.toml`, ownership decision. |
| reviewer | Reviewer | Security/correctness review of payments + fulfillment + deploy config; verify guardrails, idempotency, secret handling. |
| tester | Tester | Unit tests (money math), Stripe CLI webhook smoke, manual test-mode end-to-end, build/lint/typecheck, deploy-preview smoke. |

### Task Dependencies

| ID | Agent | Task | Depends On | Validates |
|----|-------|------|------------|-----------|
| T1 | builder-2 | S3 — migration `009` fulfillment guard column(s) (F8). | — | — |
| T2 | builder-1 | S1+S2 — Stripe amount builder (delivery+discount, guardrail, idempotencyKey) + create-session route (reuse/reject/POST) (F1, F4). | — | — |
| T3 | builder-2 | S4 — webhook atomic paid transition + notify-once; `placeOrder` COD-only notify (F2, F4). | T1 | — |
| T4 | builder-1 | S5 — confirmation-page payment-status states + processing poll + optional Stripe fast-path (F3). | T3 | — |
| T5 | builder-2 | S6+S7 — `.env.example`, `.env.local`/Netlify env, root `netlify.toml`, Node version (F5, F6). | — | — |
| T6 | builder-2 | S8 — Vercel/Netlify ownership audit + unlink decision + ADR + `@vercel/*` dep call (F7). | — | — |
| T7 | builder-1 | S9 (code) — add `typecheck` script + unit tests for money math (F9). | T2 | — |
| T8 | reviewer | Review payments slice (amount equality, idempotency, no client-trusted amounts, secret handling). | T2, T4, T7 | T2, T4, T7 |
| T9 | reviewer | Review fulfillment + infra slice (notify-once, migration, env scoping, netlify.toml, ownership). | T3, T5, T6 | T3, T5, T6 |
| T10 | tester | S10 — Stripe CLI webhook smoke + manual test-mode end-to-end across all states; assert charge == total_aed and single notify. | T8, T9 | T2, T3, T4 |
| T11 | tester | Build/deploy gate — lint, typecheck, build, unit tests, Netlify deploy-preview smoke + webhook reachability. | T8, T9 | T5, T6, T7 |

### Execution Notes

- **Parallel start:** T1, T2, T5, T6 have no dependencies — run concurrently.
- T3 needs the guard column from T1; T4 needs the paid-state semantics from T3.
- T7 (tests) tracks T2's amount-builder API; keep them in sync.
- Reviewers (T8/T9) run per-slice as soon as their inputs land — do not wait for
  the whole build set.
- Testers (T10/T11) are the final gate; T10 covers payment behavior, T11 covers
  build/deploy. Neither runs against **live** Stripe keys — test mode only.
- **Blockers** are owner/account decisions (Stripe approval, domain, plugin
  compat, account ownership). Surface them early; they gate the final cutover
  (S11) but not the build/test work.
- **Safety:** no live keys, no real charges, no deploy-to-prod, and no migration
  applied to a production database without explicit approval. Never print secrets.
