# Changelog

All notable changes to Napoli 7 are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Admin delivery-zones management UI** — `/admin/delivery-zones` now lets admins add, edit, rename, hide/show, reorder, and delete `delivery_zones` rows (area, fee, position, active) without using Supabase SQL. Checkout is revalidated when zones change so active areas and fees refresh for customers.
- **Admin-only navigation + dashboard** — admin users now land in the admin console, see admin-specific navigation instead of the customer account shell, and are redirected back to `/admin` if they try customer account routes.
- **Owned brand photography placeholders** — every image under `public/images/` (hero, editorial, location, 23 product shots) replaced with locally generated, fully-owned, per-item brand placeholders (no external/copyrighted assets), optimized for launch (e.g. hero 194 KB → 58 KB, products down to ~10–27 KB each). Regenerable via `node scripts/generate-brand-images.mjs`. Swap-to-real-photo specs in `docs/OWNER_PHOTO_CHECKLIST.md` — paths/filenames are stable so no code changes are needed on swap.
- **Per-page canonical tags** — `metadata.alternates.canonical` audited and present on every `src/app` route, including noindex private/admin/order-confirmation pages. Dynamic routes (`/menu/[slug]`, `/order/[id]/confirmation`, `/admin/catalog/[id]`) emit per-instance canonicals via `generateMetadata`.
- **Branded auth email templates** — Supabase Auth confirmation, magic-link, invite, email-change, reauthentication, and password-reset templates now use a Napoli 7 branded HTML layout with production-safe redirect URLs.

### Changed
- **Catalog image source hardening** — Supabase-backed catalog rows now resolve known product image filenames to the stable local `/images/products/*` launch assets, preventing stale/broken remote storage URLs from leaving menu cards blank.
- **Account address management** — `/account/addresses` now provides real saved-address add/delete/default actions for customer accounts instead of the stale Supabase-auth placeholder copy.
- **Transactional email layouts** — kitchen order alerts, customer order-status emails, and contact-form emails now include branded HTML bodies while preserving plain-text fallbacks.
- **Accessibility pass** — editorial images now carry descriptive `alt` text (were empty `alt=""`); the cart promo input wires `aria-describedby`/`aria-invalid` to its inline error (`role="status"`); the hero delivery-area input gained an explicit `aria-label`; the homepage gained an accessible `h1`; the mobile order bar is now a `nav` landmark; low-contrast menu/detail microcopy was strengthened. Puppeteer + axe-core verified 0 serious / 0 critical WCAG 2 A/AA violations on `/`, `/menu`, `/menu/margherita-classic`, `/cart`, and `/checkout`.
- **Performance / image optimization pass** — all `public/images/` assets recompressed to launch-ready sizes (progressive JPEG); editorial images load lazily through `next/image`; the menu layout is server-rendered to reduce client JS; cart no longer renders a hydration-only loading state for the empty-cart LCP path. Verified with `next build`, `tsc --noEmit`, `eslint` (0 errors) and Lighthouse 90+ performance/SEO on all target routes.

### Known follow-up
- **Supabase Auth SMTP** — Auth emails are currently branded through Supabase's built-in sender. For stronger inbox placement and sender reputation, connect verified Napoli 7 SMTP/Resend SMTP credentials in Supabase Auth once the email domain credentials are available.

## [0.2.0] - 2026-06-02

### Added
- **Promo codes** — `promo_codes` table + race-safe `redeem_promo_code` RPC (`007_promo_codes.sql`); `orders.promo_code` / `orders.discount_aed` columns. Percentage + flat-AED discounts with min-subtotal, validity window, and usage cap. `validatePromoCode(code, subtotal)` server action, logic in `src/lib/promo.ts`, wired through the cart store and `CartSummary` apply/remove; `placeOrder` re-validates, persists, and redeems. Seed codes: `WELCOME10`, `NAPOLI20`.
- **Per-area delivery fees** — `delivery_zones` table (`area` PK, `fee_aed`, `position`, `active`) with public read + admin RLS, seeded Ajman areas (`008_delivery_zones.sql`). `getDeliveryZones()` / `getDeliveryFee(area)` + `DEFAULT_DELIVERY_FEE` in `src/lib/checkout.ts`. Checkout area field is now a zone `<select>` with live fee; `placeOrder` recomputes the fee server-side and persists `delivery_fee_aed`. Pickup is free.

## [0.1.0] - 2026-05-26

### Added
- **Phase 1 — Marketing & content**: `/deals`, `/about`, `/location`, `/contact`, `/delivery`, `/legal/{privacy,terms,refund}`, plus `loading`/`not-found`/`error` boundaries and skip-to-content.
- **Phase 2 — Menu catalog**: `/menu` with category filter, `/menu/[slug]` (23 SKUs prerendered), per-ingredient customization, quantity stepper, related-products strip. Supabase-backed catalog reads via `src/lib/catalog.ts` with mock fallback; product sizes table and `catalog-images` storage bucket.
- **Phase 3 — Cart, checkout, orders**: Zustand cart + localStorage; `/cart`, `/checkout`, `/order/[id]/confirmation`, `/track`; `placeOrder` server action → Supabase `orders` + `order_items`; Resend kitchen email; contact form → Resend.
- **Phase 4 — Auth, account, payments**: `src/proxy.ts` Supabase session refresh (Next.js 16 replacement for `middleware.ts`); `/login`, `/register` (UAE `+9715XXXXXXXX` mobile required), magic link; `/account` + orders/addresses/wishlist; Stripe Checkout (`/api/checkout/create-session`, `/api/checkout/stripe-webhook`); WhatsApp Cloud API lib.
- **Phase 5 (partial) — Admin, SEO, polish**: role-gated `/admin/orders` and full-CRUD `/admin/catalog` with image upload; db-driven `sitemap.ts` + `robots.ts`; `LocalBusiness` + `MenuItem` JSON-LD; root and per-product OpenGraph images via `next/og`; Vercel Analytics + Speed Insights.
- Mobile-responsive nav drawer + sticky bottom action bar, with a11y (inert background, focus management, reduced-motion) and 360px overflow fixes.

[Unreleased]: https://github.com/teamupai/napoli7/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/teamupai/napoli7/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/teamupai/napoli7/releases/tag/v0.1.0
