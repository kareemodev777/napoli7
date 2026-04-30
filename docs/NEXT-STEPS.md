# Napoli 7 — Next Steps to Production

**Date**: 2026-04-30
**Status snapshot**: Phases 1–2 fully shipped (UI + mock data). Phases 3–5 ship as code but stay dormant until external services are configured. Roughly **70% of code-side work is done**; remaining ~30% is owner setup + activation work + admin polish.

This document is the single checklist between here and a production launch. Items are grouped by category, not by phase. Each item lists who owns it (👤 = owner, 👨‍💻 = engineering, 🤝 = both) and a rough effort estimate.

---

## 0. Critical path to first real order

The shortest sequence to take a real paid order from a customer:

1. **Supabase project** created + migrations 001 + 002 + 003 applied (👤, 30 min)
2. **Catalog seeded** in Supabase from `src/data/mock/catalog.ts` (👨‍💻, half day) — also requires switching `src/lib/catalog.ts` reads from mock to Supabase with `use cache`
3. **Resend account** + API key + sender domain verification (👤, 1 day for DNS propagation)
4. **Vercel project** linked + env vars set + first preview deploy (👨‍💻, 1 hour)
5. **Test order placed end-to-end** (COD path, no Stripe needed) — kitchen email arrives, `/track` works, `/admin/orders` shows it (🤝, 30 min)
6. **Stripe UAE account** activated + test keys in Vercel + webhook secret from `stripe listen` (👤, 2–7 days for KYC), then card payment goes live

After step 5 the site can launch with COD only; step 6 unlocks card payments.

---

## 1. External dependencies (owner)

These block engineering — they must be obtained before the corresponding code activates.

- [ ] **Supabase project** (`napoli7-prod` recommended) — get URL, anon key, service role key
- [ ] **Resend account** — verify `napoli7.com` sender domain (SPF, DKIM, DMARC), get API key
- [ ] **Stripe UAE business account** — submit trade license, owner ID, bank account; rotate test → live keys at launch
- [ ] **Stripe webhook signing secret** — generated in the Stripe Dashboard once the live endpoint is configured
- [ ] **Meta WhatsApp Business Cloud API** — create app, request `new_order_kitchen` template approval (24–48 hr review)
- [ ] **Vercel project** — connected to GitHub repo, env vars set per `.env.example`
- [ ] **Domain** — `napoli7.com` DNS pointed at Vercel, SSL active
- [ ] **Brand photography** — 23 product shots + hero + 3 editorial shots (currently all 23 product files are clones of `hero-pizza.jpg`)
- [ ] **Legal review** — privacy / terms / refund pages reviewed by UAE counsel
- [ ] **Owner-bootstrap an admin user** — register a normal account, then in Supabase SQL editor: `INSERT INTO user_roles (user_id, role) VALUES ('your-uuid', 'admin');`

---

## 2. Backend wiring (engineering)

Code that is written but needs a real Supabase project to come alive, plus the bridge work to migrate from mock data.

### Catalog migration
- [ ] Add `src/lib/catalog.ts` with `getCatalog()`, `getProductBySlug()`, `getProductsByCategory()` reading from Supabase using `use cache` + `cacheTag('catalog')` + `cacheLife('hours')`
- [ ] Replace imports of `@/data/mock/catalog` across the codebase with `@/lib/catalog`
- [ ] Create `scripts/seed-catalog.ts` — reads `mock/catalog.ts` and inserts into Supabase `categories` / `products` / `product_customizations` (uses service role client; idempotent via `ON CONFLICT`)
- [ ] Update `generateStaticParams` in `src/app/menu/[slug]/page.tsx` to read from Supabase (or keep mock list as a build-time source of truth — decide which)
- [ ] Add image storage strategy: either keep static `/public/images/products/*.jpg` (simple) or move to Supabase Storage + add `images.remotePatterns` in `next.config.ts` (scalable)

### Account / auth flows
- [ ] Verify magic-link email lands and `/login?confirmed=true` flow works end-to-end with real Supabase
- [ ] Implement `/account/addresses` CRUD UI + server actions (table + RLS already exist in migration 002)
- [ ] Implement `/account/wishlist` toggle from product cards: heart icon component on `MenuProductCard` + server action that writes to `wishlists`
- [ ] Implement order detail `Sheet` on `/account/orders` (currently rows have no expansion)
- [ ] Hook the password-reset redirect (`updatePassword` step on a `/auth/update-password` route — Supabase sends customer there from the reset email)
- [ ] After login, link any guest orders that match `customer_email` to the user's `user_id`

### Checkout completeness
- [ ] **Wire promo code validation**: `validatePromo` server action checks `promo_codes` table, recomputes total in `placeOrder`. UI currently shows "Promo codes available soon"
- [ ] **Wire delivery fee logic**: lookup `delivery_zones` by area name (debounced on the area input), display fee in checkout summary, recompute in `placeOrder`. UI currently shows "TBD"
- [ ] **Verify Stripe webhook** in production: `stripe listen` for local, then set live `STRIPE_WEBHOOK_SECRET` in Vercel + send a test event from the Stripe Dashboard
- [ ] **Confirmation page reconciliation**: re-fetch Stripe session via `stripe.checkout.sessions.retrieve` before showing "PAID" — never trust the redirect alone (currently shown but not reconciled)
- [ ] **Wire the contact form** to a Server Action that calls `notifyContactMessageEmail` (Phase 1 form is still client-only — function already exists in `src/lib/notifications/email.ts`)

### Notifications
- [ ] Build the WhatsApp `new_order_kitchen` template body in Meta and update `notifyKitchenWhatsApp` to use the approved template (current code sends a free-form text message — works in test but production templates are required)
- [ ] Test customer status emails (out_for_delivery, delivered, cancelled) — already wired in `updateOrderStatus`, just needs Resend live

---

## 3. Admin functionality (engineering)

Today only `/admin/orders` exists. To run the business from the back-office:

### Admin shell
- [ ] `/admin` layout: left nav (Orders / Products / Promo codes / Delivery zones / Settings) + admin user chip + sign-out
- [ ] Dashboard at `/admin` (today's revenue, today's order count, top 5 sellers, recent activity feed)

### Orders (extend existing)
- [ ] Filter bar on `/admin/orders`: status, date range, payment method
- [ ] Search by order number / phone / name
- [ ] Order detail `Sheet` (full items + customizations + address + click-to-call phone)
- [ ] CSV export
- [ ] Auto-refresh every 30s (currently static — `setInterval` + `router.refresh()` is sufficient)
- [ ] Optional: Supabase Realtime subscription so new orders appear without a refresh

### Products (new)
- [ ] `/admin/products` — list view (image, name, category, price, active toggle)
- [ ] `/admin/products/[id]` — edit form: name, italian name, description, prices per size, image upload to Supabase Storage, customization rows, veg/spicy flags
- [ ] `/admin/products/new` — same form, blank
- [ ] Soft-delete via `is_active` toggle (preserves order history references)
- [ ] Drag-to-reorder via `position` field
- [ ] Cache invalidation: after every write, call `revalidateTag('catalog')`

### Promo codes (new)
- [ ] `/admin/promo-codes` — list + create/edit form (code, discount type, value, min order, max uses, expires_at, active)
- [ ] Show usage count + last-used date

### Delivery zones (new)
- [ ] `/admin/delivery-zones` — list + create/edit form (area name, fee, min order, active)
- [ ] Map preview optional (Phase 6)

### Customers (optional)
- [ ] `/admin/customers` — list of registered users with order count + lifetime spend; click into per-customer order history

---

## 4. Frontend gaps

Small UX issues found during the build that should be closed before launch:

- [ ] **Mobile nav** — `Header.tsx` shows nav links only at `lg:flex`; below 1024px there's no menu. Add a hamburger button + slide-out `Sheet` listing all nav links + cart link
- [ ] **Footer** has a static set of links — verify legal/refund/terms hrefs all work after final URL slugs are decided
- [ ] **Cookie consent** — current bar covers EU defaults; UAE PDPL compliance review (probably fine, owner to confirm)
- [ ] **`/admin` redirect** — current redirects to `/admin/orders`; once admin shell exists, redirect to `/admin` dashboard instead
- [ ] **`/menu` size-tier disclosure** — Regular = Small + 10 AED is a placeholder; replace with real prices once owner confirms
- [ ] **Customizations** data — I added customization rows to all 7 pizzas. Owner to verify which ingredients are actually offered as Extra / Removable
- [ ] **Empty states** — Audit every page (`/cart`, `/account/orders`, `/account/wishlist`, `/admin/orders`) to ensure first-time empty states are designed, not blank
- [ ] **Skeleton loaders** — `/menu` and `/account/orders` currently show a text placeholder; replace with skeleton card components for a more polished loading state

---

## 5. Content (owner + engineering)

Copy and assets that need owner sign-off before launch:

- [ ] **Product descriptions** — current copy is plausible but owner-written copy is better
- [ ] **Real prices per size** — currently Regular = Small + 10 AED across the board; confirm actual differential
- [ ] **Customization options + extras pricing** — confirm what's offered and per-ingredient extra cost
- [ ] **About page copy** — founder story, craft section, philosophy
- [ ] **Deals page** — secondary deals (weekday lunch, family bundle) are placeholders
- [ ] **FAQ** — 7 items, owner to verify accuracy on hours, payment methods, allergies
- [ ] **Legal pages** — privacy/terms/refund need UAE legal review
- [ ] **WhatsApp template body** — text submitted to Meta for approval
- [ ] **Customer status email templates** — out_for_delivery / delivered / cancelled subject + body
- [ ] **OG images** — homepage OG generated via `next/og` is generic navy + name; owner can upgrade with brand shoot once available

---

## 6. Production polish (engineering)

Before flipping the domain:

- [ ] **Lighthouse run** on production URL — Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO = 100
- [ ] **axe-core run** on every public page — zero critical/serious violations
- [ ] **Image optimization audit** — confirm all `next/image` instances have correct `sizes` and only the LCP image has `priority`
- [ ] **Bundle size check** — `next build` output, watch for unexpected large client chunks
- [ ] **Sentry** (or alternative) — error monitoring for production
- [ ] **Vercel Analytics** — already wired via `<Analytics />` + `<SpeedInsights />` in layout; verify data flowing in dashboard after first deploys
- [ ] **CI** — GitHub Actions workflow running `bun run lint`, `bunx tsc --noEmit`, `bun run build` on every PR
- [ ] **Preview deployments** — Vercel auto-previews configured per PR
- [ ] **Backup strategy** — Supabase point-in-time recovery enabled (paid plan) or scheduled `pg_dump` cron
- [ ] **Email deliverability** — SPF / DKIM / DMARC records live for `napoli7.com` so Resend mails don't go to spam
- [ ] **Domain redirects** — www → apex (or apex → www), HTTPS forced, old WordPress URLs 301 redirected if applicable

---

## 7. Testing checklist

Run through these before pulling the switch:

### Functional
- [ ] Place a guest COD order on mobile (390px) — kitchen email arrives, order in DB, `/track` returns the right state
- [ ] Place a registered-user card order — Stripe test card 4242 succeeds, webhook fires, `payment_status='paid'`
- [ ] Decline card 4000 0000 0000 9995 — `payment_status='failed'`
- [ ] 3DS card 4000 0027 6000 3184 — challenge appears and clears
- [ ] Apple Pay button visible on Safari/iOS; Google Pay on Chrome/Android with a saved card
- [ ] Magic link flow — request → email → click → logged in
- [ ] Password reset — request → email → click → set new password → logged in
- [ ] `/account/orders` shows orders for the logged-in user only (RLS test with second user)
- [ ] Admin user can update order status; non-admin gets redirected away from `/admin`
- [ ] Promo code `WELCOME` applies correctly at checkout
- [ ] Delivery zone fee for Al Jurf 2 = 5.00 AED, unknown area suggests pickup

### Cross-browser / device
- [ ] Safari macOS, Safari iOS, Chrome desktop, Chrome Android, Firefox
- [ ] 390px / 768px / 1280px / 1920px viewport testing on every major page
- [ ] Slow 3G LCP target < 2.5s on `/`, `/menu`, `/menu/[slug]`

### Accessibility
- [ ] Keyboard-only walkthrough of: home → menu → product detail → cart → checkout → confirmation → track
- [ ] Screen reader (VoiceOver / NVDA) on the same flow
- [ ] Skip-to-content visible on focus, lands on `<main id="main">`
- [ ] Focus rings visible on every interactive element

### Security
- [ ] RLS policies tested with two distinct user accounts — user A cannot read user B's orders, addresses, wishlist
- [ ] Stripe webhook rejects requests without a valid signature (`curl -X POST` returns 400)
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` reachable from any client bundle (audit `bun run build` output)
- [ ] CSP headers / security headers reviewed (Vercel default + custom additions)

---

## 8. Phase 6 (explicitly deferred — do NOT block launch on these)

From `docs/DEV-PLAN.md` §Phase 6:

- Arabic locale (`next-intl` + `i18n/ar.json` + Tajawal font + `dir="rtl"`)
- Interactive delivery zone calculator with Google Maps API + address geocoding
- Loyalty / points system
- Supabase Realtime push for `/track` status updates
- Post-delivery review prompt email + ratings system

---

## Effort estimate to launch

Assuming all owner blockers (Supabase, Resend, Stripe, photography) are unblocked in parallel:

| Track | Engineering effort |
|-------|--------------------|
| Supabase setup + catalog migration + cache wiring | 1 day |
| Account flows polish (addresses CRUD, wishlist, order detail Sheet) | 1 day |
| Checkout completeness (promo + delivery fee + contact form wire) | 1 day |
| Admin shell + Products / Promo / Zones CRUD | 2–3 days |
| Mobile nav + skeletons + design polish pass | 1 day |
| Production polish (Lighthouse, axe, CI, Sentry) | 1 day |
| Testing pass (functional + cross-browser + a11y + security) | 1 day |
| **Total** | **8–9 working days** |

Owner setup runs in parallel and is the long pole on Stripe (UAE KYC) and Meta WhatsApp template approval (48 hours).

---

## Deletion / cleanup TODOs found during the build

- Replace `let response` / dead-code patterns flagged during validation — already done
- Consolidate two cart components: `CartView` (full page) and `CartSidebar` (panel). Today they share row markup independently; extract a `CartItemRow` once both are stable
- The `EditorialGrid` typing was relaxed to add `titleNode`; consider moving article copy to a typed data file
- Mock data file `src/data/mock/catalog.ts` should be marked as a seed-only source after migration; consider moving to `scripts/seed/` to avoid being imported at runtime in production
