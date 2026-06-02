# Changelog

All notable changes to Napoli 7 are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Admin delivery-zones management UI** — `/admin/delivery-zones` now lets admins add, edit, rename, hide/show, reorder, and delete `delivery_zones` rows (area, fee, position, active) without using Supabase SQL. Checkout is revalidated when zones change so active areas and fees refresh for customers.

### Planned
- Brand photography to replace `public/images/` placeholders.
- Per-page canonical tags audit.
- Final a11y (axe) and performance (Lighthouse 90+) passes.

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
