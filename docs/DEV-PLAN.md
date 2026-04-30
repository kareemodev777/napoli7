# Napoli 7 — Development Plan

**Version**: 1.0
**Date**: 2026-04-30
**Tech stack**: Next.js 16.2.4 · React 19 · TypeScript 5 · Tailwind v4 · shadcn/ui (radix-nova) · Supabase · Vercel

---

## Summary

5 phases, approximately 13–19 working days total. Each phase is deployable. Each phase ends with an owner approval gate before the next begins. The homepage is already shipped — planning starts at Phase 1 = real product work.

| Phase | Name | Effort | Gate |
|-------|------|--------|------|
| 1 | Marketing & Content Pages | 2–3 days | Owner approves all 8 routes visually |
| 2 | Menu Catalog | 2–3 days | Owner approves product card + detail page |
| 3 | Cart, Checkout, Orders | 3–5 days | Test order placed end-to-end (COD) |
| 4 | Auth, Account, Payments | 3–4 days | Card payment works (Stripe test mode); account flow approved |
| 5 | Admin, SEO, Polish | 3–4 days | Owner says "ready to go live" |

Phase 6 (Arabic locale + delivery zone calculator + loyalty) is defined separately as future work.

---

## Architecture Decisions

| Concern | Decision | ADR |
|---------|----------|-----|
| Data layer | Supabase Postgres. Mock TypeScript seed file during Phases 1–2, migrated to Supabase in Phase 3. Cache Components (`use cache` + `cacheTag('catalog')`) eliminate per-request DB cost. | ADR-001 |
| Auth | Supabase Auth (email/password + magic link). `@supabase/ssr` in Next.js 16 `proxy.ts`. RLS enforces data isolation. | ADR-002 |
| Payments | Stripe Checkout (hosted). Native AED settlement via Stripe UAE. 3DS2 + Apple Pay + Google Pay automatic. COD in Phase 3, Stripe in Phase 4. | ADR-003 |
| Order notification | WhatsApp Business Cloud API (primary) + Resend email (fallback). Wired in Phase 4 when Meta account is approved. Phase 3 uses email only. | ADR-004 |
| Cart state | Zustand + localStorage. Persisted to Supabase only if user is logged in (Phase 4). | ADR-005 |

---

## Phase Dependency Graph

```
Homepage (DONE)
    |
Phase 1: Marketing pages (no backend)
    |
    v
Phase 2: Menu catalog (mock data, no backend)
    |
    v
Phase 3: Cart + checkout + orders (Supabase write, COD, email)
    |
    v
Phase 4: Auth + account + Stripe payment
    |
    v
Phase 5: Admin + SEO + production polish
    |
    v
[LAUNCH]
```

Phases 1 and 2 are independent — they can be built in parallel if two builders are available. Phases 3–5 are strictly sequential.

---

## Phase Detail

### Phase 1 — Marketing & Content Pages
**File**: `specs/phases/phase-1-marketing-pages.md`

Ships 8 routes as pure UI with static TypeScript copy. No Supabase, no auth, no cart.

Routes: `/deals`, `/about`, `/location`, `/contact`, `/delivery`, `/legal/privacy`, `/legal/terms`, `/legal/refund`, plus global `not-found.tsx` and `error.tsx`.

New components: `PageHero`, `FeatureTiles`, `FaqAccordion`, `ContactForm` (client-only, Phase 1), `LegalNav`, `MapEmbed`.

shadcn installs: `accordion`.

**Gate**: Owner reviews Vercel preview URL. All 8 routes signed off. No broken links. No DESIGN.md violations. `next build` exits 0.

---

### Phase 2 — Menu Catalog
**File**: `specs/phases/phase-2-menu-catalog.md`

23 SKUs fully browsable with category filter. Product detail pages with customization (per-ingredient radio), quantity stepper, related products strip. All 23 pages statically generated via `generateStaticParams`. "Add to cart" logs to console in this phase.

Routes: `/menu`, `/menu/[slug]`.

New components: `ProductCard`, `ProductGrid`, `CategoryTabs`, `ProductDetail`, `CustomizationRow`, `QuantityStepper`, `RelatedProducts`, `VegDot`, `SpicyDot`, `Breadcrumb`.

Data: `src/data/mock/catalog.ts` + `src/data/types/catalog.ts` — the TypeScript types become the Supabase schema in Phase 3.

shadcn installs: `radio-group`, `badge`, `separator`.

**Gate**: Owner approves product card design and product detail page. All 23 products correct. `next build` shows 23 static pages.

---

### Phase 3 — Cart, Checkout, Orders
**File**: `specs/phases/phase-3-cart-checkout-orders.md`

Supabase project created. Catalog migrated to Supabase with Cache Components. Zustand cart wired. Full order funnel: cart page, checkout form (COD only), `placeOrder` Server Action, order confirmation, `/track` public tracker.

Kitchen notification: Resend email to `info@napoli7.com` on every order.

Routes: `/cart`, `/checkout`, `/order/[id]/confirmation`, `/track`.

New tables: `orders`, `order_items`. Supabase migration at `supabase/migrations/001_catalog_and_orders.sql`.

shadcn installs: `select`, `alert`.

**Gate**: A complete test order placed by a guest. Kitchen email received. Order visible in Supabase. `/track` returns correct status.

---

### Phase 4 — Auth, Account, Payments
**File**: `specs/phases/phase-4-auth-account-payments.md`

Supabase Auth (email/password + magic link). `src/proxy.ts` session refresh. Customer account: dashboard, order history, saved addresses, wishlist. Stripe Checkout (hosted) integrated. WhatsApp kitchen notification wired.

Routes: `/login`, `/register`, `/account`, `/account/orders`, `/account/addresses`, `/account/wishlist`, `/api/checkout/create-session`, `/api/checkout/stripe-webhook`.

New tables: `saved_addresses`, `wishlists`, `user_roles`.

shadcn installs: `sheet`, `dialog`, `tabs`.

**Gate**: Card payment completes end-to-end in Stripe test mode (success card, declined card, 3DS card). Account flow approved by owner.

**External dependency**: Stripe account active. Test-mode keys are enough to start Phase 4 work — no merchant approval delay. Live-mode keys (and the live webhook signing secret) only need to be in place at the launch gate; the owner activates Stripe with UAE business KYC (trade license, owner ID, bank account) when ready.

**External dependency**: Meta WhatsApp Business account and template approval needed. Submit `new_order_kitchen` template during Phase 3 (24–48 hour approval).

---

### Phase 5 — Admin, SEO, and Production Polish
**File**: `specs/phases/phase-5-admin-seo-polish.md`

Kitchen admin panel at `/admin/orders` (role-gated). Order status updates with customer notification email. Full SEO: `sitemap.ts`, `robots.ts`, JSON-LD structured data, OG image generation. Vercel Analytics + Speed Insights. Brand photography swap. Promo code validation. Delivery fee logic. Final accessibility audit.

New routes: `/admin`, `/admin/orders`.
New tables: `promo_codes`, `delivery_zones`.

**Gate**: Lighthouse Performance >= 90, SEO = 100. Owner confirms production readiness.

---

## Sitemap (v2 — full)

```
/                           Home (shipped)
/menu                       Full catalog grid
/menu/[slug]                Product detail (23 pages)
/deals                      Deals & welcome offer
/about                      Brand story and philosophy
/location                   Address, hours, map
/contact                    Contact form + FAQ
/delivery                   Delivery information
/legal/privacy              Privacy policy
/legal/terms                Terms & conditions
/legal/refund               Refund & cancellation
/track                      Public order tracker
/cart                       Cart
/checkout                   Checkout
/order/[id]/confirmation    Order confirmation
/login                      Login
/register                   Register
/account                    Account dashboard
/account/orders             Order history
/account/addresses          Saved addresses
/account/wishlist           Wishlist
/admin/orders               Kitchen admin (admin role only)
```

---

## File Structure (final state after Phase 5)

```
src/
  app/
    layout.tsx               # Root layout (fonts, Analytics)
    page.tsx                 # Homepage (shipped)
    globals.css              # Design tokens + utilities
    not-found.tsx
    error.tsx
    loading.tsx
    sitemap.ts
    robots.ts
    opengraph-image.tsx
    menu/
      page.tsx
      loading.tsx
      [slug]/
        page.tsx
        loading.tsx
        opengraph-image.tsx
    deals/page.tsx
    about/page.tsx
    location/page.tsx
    contact/page.tsx
    delivery/page.tsx
    legal/
      privacy/page.tsx
      terms/page.tsx
      refund/page.tsx
    cart/page.tsx
    checkout/
      page.tsx
      actions.ts
    order/[id]/confirmation/page.tsx
    track/
      page.tsx
      actions.ts
    login/page.tsx
    register/page.tsx
    account/
      page.tsx
      orders/page.tsx
      addresses/page.tsx
      wishlist/page.tsx
    admin/
      layout.tsx
      page.tsx
      orders/
        page.tsx
        actions.ts
    api/
      checkout/
        create-session/route.ts
        stripe-webhook/route.ts
  components/
    site/                    # Shipped: Header, Hero, Footer, etc.
    catalog/                 # Phase 2
    cart/                    # Phase 3
    checkout/                # Phase 3
    auth/                    # Phase 4
    account/                 # Phase 4
    track/                   # Phase 3
    admin/                   # Phase 5
    structured-data/         # Phase 5
    ui/                      # shadcn primitives
  data/
    types/catalog.ts
    mock/catalog.ts
  store/
    cart.ts                  # Zustand
  lib/
    supabase/
      server.ts
      client.ts
    auth/
      require-auth.ts
      require-admin.ts
    notifications/
      email.ts               # Resend
      whatsapp.ts            # Meta Cloud API
    payments/
      stripe.ts
    catalog.ts               # Cache Component functions
    utils.ts
  i18n/
    en.json
  proxy.ts                   # Next.js 16 session refresh

public/
  logo.png
  images/
    hero-pizza.jpg
    article-*.jpg
    location-block.jpg
    products/                # 23 product images

docs/
  DESIGN.md
  SITEMAP.md
  DEV-PLAN.md
  decisions/
    ADR-001-data-layer.md
    ADR-002-auth.md
    ADR-003-payments.md
    ADR-004-order-notification.md
    ADR-005-cart-state.md

specs/phases/
  phase-1-marketing-pages.md
  phase-2-menu-catalog.md
  phase-3-cart-checkout-orders.md
  phase-4-auth-account-payments.md
  phase-5-admin-seo-polish.md

supabase/
  migrations/
    001_catalog_and_orders.sql
    002_auth_and_accounts.sql
    003_admin.sql
```

---

## Environment Variables (complete list)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (email notifications)
RESEND_API_KEY=
ORDER_EMAIL_TO=info@napoli7.com
ORDER_EMAIL_FROM=orders@napoli7.com

# Stripe (payments — Phase 4). UAE entity, native AED settlement.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# WhatsApp Business Cloud API (Phase 4)
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
KITCHEN_WHATSAPP_NUMBER=+971501628577

# Site
NEXT_PUBLIC_SITE_URL=https://napoli7.com
```

---

## Design System Constraints (summary, refer to docs/DESIGN.md for full detail)

These constraints apply to every line of UI code written in every phase. Builders must verify compliance before submitting any phase for review.

- Corners: 0px default. 2px (`--radius-sm`) for badges. 4px (`--radius-md`) for product images and modals only.
- Colors: navy `#1E3A8A` for primary CTAs and headings accent. Azure `#34A5DC` for secondary fills only — never body text, never primary CTA.
- Italian flag green/red: footer micro-strip, veg dot, spicy dot only. Nowhere else.
- Headings: H1 and H2 UPPERCASE with `letter-spacing: 1.5px`. H3+ sentence case.
- Typography: Inter Tight (display/headings), Inter (body). No system fonts without the correct fallback chain.
- No emoji anywhere in any UI surface.
- No gradients of any kind.
- No side-stripe card borders.
- No bouncy/spring motion — linear or near-linear easings only.
- Icons: lucide-react only. 24x24 grid, 1.5px stroke.
- Images: `next/image` always. Hero LCP: `priority` prop. All others: lazy.
- Touch targets: 44x44px minimum on all interactive elements.

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Stripe live-mode KYC delayed | Low | Live card payments held back at launch | Test mode covers all dev work; COD already ships in Phase 3, so the site can launch and accept orders before Stripe goes live |
| Meta WhatsApp template rejected | Low | Kitchen misses WA notifications | Resend email is the fallback; kitchen can still receive orders |
| Brand photography not ready by Phase 5 | High | Site launches with placeholders | All `next/image` components accept placeholder images — photography swap is a content update, not a code change |
| Supabase RLS misconfiguration | Medium | Data leak between customer accounts | RLS policies must be tested with a second test user account before Phase 3 approval |
| Next.js 16 breaking changes vs training data | Medium | Builder writes incorrect patterns | AGENTS.md instructs builders to read `node_modules/next/dist/docs/` before coding. ADR-002 specifies `proxy.ts` not `middleware.ts`. |
| Stripe webhook signature mismatch in prod | Low | Failed payments not reflected in DB | Live webhook signing secret must be set as `STRIPE_WEBHOOK_SECRET` in Vercel before flipping to live keys. Verified by sending a test event from Stripe Dashboard. |

**Highest risk item**: Brand photography. The current placeholder images will not pass a production visual review. The owner must book the brand shoot during Phase 1–2 so images are available by Phase 5. No code change is required when photos arrive — it is a file swap.

---

## Phase 6 (Future — not planned in detail)

Work planned for a future phase after successful launch:

- **Arabic locale**: `next-intl` integration, `i18n/ar.json` copy, Tajawal font, `dir="rtl"` via `<html lang="ar" dir="rtl">`, RTL layout testing.
- **Delivery zone calculator**: interactive Ajman zone map (Google Maps API), customer address geocoding, dynamic fee calculation.
- **Loyalty / points**: purchase-linked points, redemption at checkout, dashboard widget.
- **Supabase Realtime**: push order status updates to `/track` without polling.
- **Review system**: post-delivery email prompting customers to rate their order.
