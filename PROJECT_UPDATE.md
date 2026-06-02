# Napoli 7 — Project Update (2026-06-03)

> Version history is tracked in `CHANGELOG.md`. Current release: **0.2.0** (promo codes + per-area delivery fees).

Single-store Neapolitan pizzeria webshop (Al Jurf 2, Ajman, UAE). Rebuilt to match the
Swiss discipline of `webshop.dieci.ch` in the brand's *azzurro* palette.

- **Production**: `napoli7.com` (current site by Dotline — will be replaced)
- **Repo**: `teamupai/napoli7` (private)
- **Stack**: Next.js 16 (App Router, `proxy.ts`), React 19, Tailwind, Supabase (Postgres + Auth + Storage), Stripe Checkout, Resend, WhatsApp Cloud API, Vercel hosting
- **Currency**: AED · Locale: EN only (AR deferred to Phase 6)

> ⚠️ Read `AGENTS.md` first. Next.js 16 has breaking changes — APIs may differ from training data. When unsure, consult `node_modules/next/dist/docs/`.

---

## How to run

```bash
pnpm install
cp .env.example .env.local   # if present; otherwise see "Env vars" below
pnpm dev
```

App on `http://localhost:3000`.

### Env vars (see `src/lib/env.ts` for the live list)

| Key | Required for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sitemap, metadata, OG |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Catalog reads, auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side catalog + admin writes |
| `RESEND_API_KEY` | Kitchen + customer + contact emails |
| `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Pay by card |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | Kitchen WhatsApp notifications |
| `ORDER_EMAIL_TO`, `ORDER_EMAIL_FROM` | Email routing (defaults to `info@`/`orders@napoli7.com`) |

Without optional env keys the integrations log to console (graceful fallback — see each `lib/notifications/*` file).

### Supabase

Migrations live in `supabase/migrations/`. Apply with `supabase db push` or via the SQL editor.

Order: `001 → 002 → 004 → 005 → 006 → 007 → 008`. (003 was rolled into 001/002.)

---

## What's done

### Phase 1 — Marketing & Content (✅ Implemented)
`/deals`, `/about`, `/location`, `/contact`, `/delivery`, `/legal/{privacy,terms,refund}`,
plus `loading.tsx` / `not-found.tsx` / `error.tsx` and the skip-to-content link.

### Phase 2 — Menu Catalog (✅ Implemented)
`/menu` (with category filter), `/menu/[slug]` (23 SKUs prerendered), per-ingredient
customization UI, quantity stepper, related products strip. Catalog reads now go
through `src/lib/catalog.ts` (Supabase-backed with mock fallback).

### Phase 3 — Cart, Checkout, Orders (✅ Implemented)
- Zustand cart + localStorage
- `/cart`, `/checkout`, `/order/[id]/confirmation`, `/track`
- `placeOrder` Server Action → Supabase `orders` + `order_items`
- Resend email to kitchen on order placed
- Contact form Server Action wired to Resend (added 2026-05-26)

### Phase 4 — Auth, Account, Payments (✅ Implemented)
- `src/proxy.ts` (Supabase session refresh — Next.js 16 replacement for `middleware.ts`)
- `/login`, `/register` (UAE `+9715XXXXXXXX` mobile required), magic link flow
- `/account`, `/account/orders`, `/account/addresses`, `/account/wishlist`
- Stripe Checkout (`/api/checkout/create-session`, `/api/checkout/stripe-webhook`)
- WhatsApp Cloud API lib in `src/lib/notifications/whatsapp.ts`

### Phase 5 — Admin, SEO, Polish (🚧 In Progress)
**Shipped:**
- `/admin/orders` — role-gated kitchen view, status updates, customer phone tel: links
- `/admin/catalog` — full CRUD (list, edit, sizes, customizations, image upload to `catalog-images` Supabase Storage bucket)
- `sitemap.ts` (db-driven slugs), `robots.ts`
- `LocalBusiness` JSON-LD on homepage, `MenuItem` JSON-LD on product pages
- Root `opengraph-image.tsx` + per-product `/menu/[slug]/opengraph-image.tsx` via `next/og`
- Vercel Analytics + Speed Insights
- Contact form → Resend
- **Promo codes** — `007_promo_codes.sql` (`promo_codes` table + `redeem_promo_code` race-safe RPC + `orders.promo_code`/`discount_aed` cols). `validatePromoCode(code, subtotal)` server action in `src/app/cart/actions.ts`, logic in `src/lib/promo.ts` (pct + flat AED, min subtotal, validity window, usage cap, mock fallback). Wired through cart store (`promo`/`discount`/`total`) → `CartSummary` apply/remove → `placeOrder` re-validates + persists + redeems. Seed demo codes: `WELCOME10`, `NAPOLI20`.
- **Delivery fees per area** — `008_delivery_zones.sql` (`delivery_zones`: `area` PK, `fee_aed`, `position`, `active`; public read + admin RLS; seeded Ajman areas). `getDeliveryZones()`/`getDeliveryFee(area)` + `DEFAULT_DELIVERY_FEE` in `src/lib/checkout.ts` (mock fallback). Checkout page fetches zones server-side → area field is now a zone `<select>` with live fee → fee in order total. `placeOrder` recomputes fee server-side for delivery orders and persists `delivery_fee_aed`. Pickup = free.

---

## What's left (Phase 5 → finish)

Priority order:

0. **Admin delivery-zones management UI** — CRUD over the `delivery_zones` table (area, fee, position, active) so ops can edit fees without SQL. Spec ready: `specs/active/admin-delivery-zones.md` (planning, not yet implemented).

1. **Brand photography** — replace placeholders in `public/images/` (`hero-pizza.jpg`, `article-*.jpg`, `location-block.jpg`, `products/*`). Owner to provide. Run through `next/image` AVIF/WebP optimization.

2. **Per-page canonical tags** — audit `metadata.alternates.canonical` on each route. Currently only metadataBase is set.

3. **Final a11y pass** — axe DevTools sweep of every route. Targets: 0 critical, 0 serious.

4. **Final performance pass** — Lighthouse target: 90+ on perf/a11y/best-practices/SEO across `/`, `/menu`, `/menu/[slug]`, `/cart`, `/checkout`. Inspect bundle, lazy-load heavy components.

5. *(Optional)* Google Maps interactive embed at `/location` — only if `NEXT_PUBLIC_GOOGLE_MAPS_KEY` provided. Currently static.

---

## What's next (after Phase 5)

### Phase 6 — Internationalization + Loyalty
- Arabic locale + RTL (`src/i18n/ar.json`, dir flip, font review)
- Customer loyalty / points system

### Phase 7 — Operational hardening
- Real-time admin order updates (Supabase Realtime instead of polling)
- Promo code analytics
- Delivery tracking (driver dispatch link?)
- Multi-language menu items in DB (`name_ar`, `description_ar` columns)

### Out of scope (do NOT build)
- Multi-store directory
- POS / kitchen display system (separate product)
- Native mobile app

---

## Conventions

- **Commits**: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`)
- **Branches**: `feature/<name>`, `bugfix/<name>`, `refactor/<name>` — direct pushes to `main` allowed for hotfixes; prefer PRs for substantial work
- **Type-checking**: `npx tsc --noEmit` should pass (currently clean)
- **Lint**: `pnpm lint` — `.netlify/`, `node_modules/`, `supabase/.temp/` are ignored via `eslint.config.mjs`

### Design system (non-negotiable)

- Palette: navy `#1E3A8A` (primary), azure `#34A5DC` (accent only), deep navy `#142A66` (footer/hover). Italian flag green `#009038` + red `#E00008` restricted to footer micro-strip, veg dot, spicy dot. **Never** for CTAs or text.
- Typography: Inter Tight (display) + Inter (body). UPPERCASE H1/H2 with `tracking-[0.15em]`+.
- Hard rules: **no emojis** in UI (SVG icons only), no gradient text, no side-stripe card borders, no uniform centered grids, no soft pastels, 0px corners.
- Design spec: `docs/DESIGN.md`. Previews: `docs/preview/colors.html`, `docs/preview/typography.html`. Content map: `docs/SITEMAP.md`.

### Specs live in `specs/`

- `specs/phases/phase-{1..5}.md` — phase specs (1–4 Implemented, 5 In Progress)
- `specs/active/` — current feature specs

---

## Key files / where things live

| Area | Path |
|---|---|
| Catalog reads | `src/lib/catalog.ts` |
| Cart store | `src/components/cart/` + Zustand store |
| Place order action | `src/app/checkout/actions.ts` |
| Stripe | `src/lib/payments/stripe.ts`, `src/app/api/checkout/*` |
| Email | `src/lib/notifications/email.ts` (Resend) |
| WhatsApp | `src/lib/notifications/whatsapp.ts` |
| Admin layout + role gate | `src/app/admin/layout.tsx`, `src/lib/auth/require-admin.ts` |
| Admin catalog | `src/app/admin/catalog/` |
| Admin orders | `src/app/admin/orders/` |
| Image upload API | `src/app/api/admin/catalog/upload-image/route.ts` |
| Auth proxy | `src/proxy.ts` |
| Env flags | `src/lib/env.ts` |
| Structured data | `src/components/structured-data/` |
| OG images | `src/app/opengraph-image.tsx`, `src/app/menu/[slug]/opengraph-image.tsx` |

---

## Contacts

- Store: Al Jurf 2, shop 4, Ajman, UAE
- Phone: `+971 6 534 5772`
- WhatsApp: `+971 50 162 8577`
- Hours: 11:00–22:00 daily
