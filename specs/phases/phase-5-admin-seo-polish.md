# Phase 5 — Admin Panel, SEO, Analytics, and Production Polish

**Effort**: 3–4 working days
**Gate**: Owner accepts the site as production-ready. All Lighthouse scores pass targets.
**Dependencies**: Phase 4 complete. Brand photography available. Meta WhatsApp template approved.

---

## Goal

Ship everything needed to go live: a minimal kitchen admin panel (order management), full SEO implementation, Vercel Analytics, production photography swap, accessibility audit remediation, and final performance tuning. This phase has no new customer-facing features — it's about operating quality and discoverability.

---

## Scope

### In

- `/admin/orders` — auth-gated kitchen view: live order table, status updates
- `/admin` layout with role check (admin only)
- `sitemap.xml` — Next.js App Router `sitemap.ts`
- `robots.txt` — Next.js App Router `robots.ts`
- Structured data: `LocalBusiness` JSON-LD on homepage, `MenuItem` JSON-LD on each product page
- Open Graph images: generated via `next/og` for homepage and product pages
- Per-page canonical tags
- Vercel Analytics + Speed Insights integration
- Brand photography swap (replace placeholder images with real brand shots)
- Contact form Server Action wired to Resend (completing the Phase 1 placeholder)
- Promo code validation logic in checkout (basic: check `promo_codes` table)
- Google Maps interactive embed upgrade (optional — only if API key is provided)
- Final accessibility audit + remediation pass
- Final performance audit + image optimization pass (AVIF/WebP via next/image)
- Delivery fee logic: configurable flat fee per area (simple lookup table)

### Out

- Arabic locale — Phase 6.
- Loyalty / points system — Phase 6.
- Multi-store directory — not planned for v1.
- Full POS / kitchen display system — separate product, not in scope.

---

## User Stories

### US-5.1 Admin: view live orders
**As** the kitchen/owner logged in with an admin role,
**I want** to see all open orders in a live-updating table,
**so that** I know what to prepare.

Acceptance criteria:
- [ ] `/admin/orders` accessible only to users with `role = 'admin'` in `user_roles`. Any other user (including logged-in customers) receives a `403`-equivalent "Access denied" page.
- [ ] Table columns: Order number, Customer name, Items (comma-separated), Total, Delivery type, Time slot, Status, Actions.
- [ ] Default sort: newest first. Filter by status (All / Received / Preparing / Out for delivery / Delivered).
- [ ] Status update: clicking a status badge opens a `<Select>` dropdown. Selecting a new status calls a Server Action that updates `orders.status` in Supabase. Row updates without full page reload.
- [ ] Table auto-refreshes every 30 seconds (Supabase Realtime is optional — simple `setInterval` + `router.refresh()` is sufficient for v1).
- [ ] Each row has a "View details" action that expands inline or opens a Sheet showing full order: items + customizations, address, customer phone (click-to-call), notes.
- [ ] Customer phone in detail view is `<a href="tel:...">` — one tap to call from a tablet.

### US-5.2 Admin: update order status
**As** the kitchen/owner,
**I want** to change an order's status with one tap,
**so that** the customer's `/track` page reflects the real state.

Acceptance criteria:
- [ ] Status progression: received → preparing → out_for_delivery → delivered.
- [ ] Cancelled status only accessible from "received" or "preparing" (not after dispatch).
- [ ] When status is changed to "out_for_delivery", a Resend email is sent to the customer: "Your order is on its way. Estimated arrival: 30 minutes."
- [ ] Server Action validates the requesting user is an admin before updating. SQL-level RLS also enforced.

### US-5.3 SEO: sitemap and robots
**As** a search engine crawler,
**I want** to find a complete sitemap and correct robots directives,
**so that** all public pages are indexed correctly.

Acceptance criteria:
- [ ] `src/app/sitemap.ts` returns all public routes: `/`, `/menu`, `/menu/[slug]` (all 23), `/about`, `/deals`, `/location`, `/contact`, `/delivery`, `/legal/privacy`, `/legal/terms`, `/legal/refund`.
- [ ] `/admin/*`, `/account/*`, `/cart`, `/checkout`, `/order/*` are excluded from sitemap.
- [ ] `src/app/robots.ts` disallows `/admin`, `/account`, `/cart`, `/checkout`, `/api`.
- [ ] Each page has a `canonical` URL (set via `alternates.canonical` in `generateMetadata`).

### US-5.4 SEO: structured data
**As** a customer searching for "Neapolitan pizza Ajman" on Google,
**I want** the search result to show rich snippets (name, address, hours, price range),
**so that** I can click with confidence.

Acceptance criteria:
- [ ] Homepage includes `LocalBusiness` JSON-LD:
  ```json
  {
    "@type": "Restaurant",
    "name": "Napoli 7",
    "address": { "@type": "PostalAddress", "streetAddress": "Shop 4, 213 Sheikh Rashid bin Abdul Aziz St", "addressLocality": "Al Jurf 2, Ajman", "addressCountry": "AE" },
    "geo": { "@type": "GeoCoordinates", "latitude": 25.4002327, "longitude": 55.5033167 },
    "openingHours": "Mo-Su 11:00-22:00",
    "telephone": "+97165345772",
    "servesCuisine": "Italian, Neapolitan",
    "priceRange": "AED 15–69"
  }
  ```
- [ ] Each `/menu/[slug]` page includes `MenuItem` JSON-LD with name, description, price, currency "AED".
- [ ] Validate with Google Rich Results Test — no errors.

### US-5.5 Open Graph images
**As** a customer sharing a Napoli 7 link on WhatsApp or social,
**I want** the link preview to show a branded image,
**so that** the link is visually appealing and trustworthy.

Acceptance criteria:
- [ ] `src/app/opengraph-image.tsx` — homepage OG: brand navy background, white "NAPOLI 7" in Inter Tight bold, "Authentic Neapolitan Pizza, Ajman" subtitle, logo mark. Generated via `next/og`. Size 1200×630.
- [ ] `src/app/menu/[slug]/opengraph-image.tsx` — product OG: product image (if available), product name, price. Fallback to homepage OG if no image.
- [ ] OG image URL resolves correctly (verify with `opengraph.io` or `metatags.io`).

### US-5.6 Analytics
**As** the owner,
**I want** to see page views, conversion funnel, and Web Vitals in Vercel Analytics,
**so that** I can understand how customers use the site.

Acceptance criteria:
- [ ] `@vercel/analytics` and `@vercel/speed-insights` installed and `<Analytics />` + `<SpeedInsights />` added to `src/app/layout.tsx`.
- [ ] Vercel dashboard shows live page view data after deploy.
- [ ] No personal data sent to Analytics (Vercel Analytics is privacy-friendly by default — confirm).

### US-5.7 Photography swap
**As** a customer browsing the menu,
**I want** to see real Napoli 7 product photography,
**so that** the food looks as good as it tastes.

Acceptance criteria:
- [ ] All 23 product images replaced with real brand photography in `public/images/products/`.
- [ ] Hero image (`/images/hero-pizza.jpg`) replaced with the hero shot.
- [ ] Article images (`article-*.jpg`) replaced with editorial shots.
- [ ] All images are AVIF primary / WebP fallback via `next/image` (Next.js handles this automatically with `<Image>`).
- [ ] Hero LCP image has `priority` prop. No other images have `priority`.
- [ ] All product images have correct `alt` text: "[Product name] from Napoli 7".

### US-5.8 Promo code validation
**As** a customer with a promo code,
**I want** to enter it at checkout and see the discount applied,
**so that** I get the benefit I was promised.

Acceptance criteria:
- [ ] `promo_codes` Supabase table: `(code text PK, discount_type 'flat'|'percent', discount_value numeric, min_order_aed numeric, max_uses int, uses_count int, expires_at timestamptz, is_active boolean)`.
- [ ] Checkout "Apply" button calls `validatePromo` Server Action: checks code exists, is active, not expired, not exhausted, order meets minimum.
- [ ] On valid code: discount row appears in order summary. `placeOrder` Server Action recomputes total with discount. Increments `uses_count`.
- [ ] On invalid code: "Code not valid or expired." in error text next to the field.
- [ ] "First pizza" welcome offer: implemented as a promo code `WELCOME` (flat discount = Margherita price = 29.00, min order 0, max uses 1 per email).

### US-5.9 Delivery fee logic
**As** a customer at checkout,
**I want** to see the delivery fee before placing my order,
**so that** there are no surprises.

Acceptance criteria:
- [ ] `delivery_zones` Supabase table: `(id uuid PK, area_name text, fee_aed numeric, min_order_aed numeric, is_active boolean)`.
- [ ] Seed data: "Al Jurf 2" = 5.00 AED fee, 20.00 AED minimum; "Ajman City" = 10.00 AED fee, 25.00 AED minimum; "Outside zone" = pickup only.
- [ ] Checkout: entering the area in Ajman field triggers a lookup (debounced, 300ms) against `delivery_zones`. Matched fee shown in summary. Unmatched: "Delivery not available to this area — choose pickup."
- [ ] `placeOrder` Server Action re-validates the fee server-side. Client-side display is for UX only.

---

## Routes Added

| Path | File | Type |
|------|------|------|
| `/admin` | `src/app/admin/page.tsx` | Redirect to `/admin/orders` |
| `/admin/orders` | `src/app/admin/orders/page.tsx` | Server (admin-gated) |
| — | `src/app/admin/layout.tsx` | Auth + role check layout |
| — | `src/app/sitemap.ts` | Sitemap generator |
| — | `src/app/robots.ts` | Robots directives |
| — | `src/app/opengraph-image.tsx` | Homepage OG image |
| — | `src/app/menu/[slug]/opengraph-image.tsx` | Product OG image |

---

## Components to Build

| File | Type | Notes |
|------|------|-------|
| `src/components/admin/OrderTable.tsx` | Client | Sortable, filterable order table with status selects. |
| `src/components/admin/OrderDetailSheet.tsx` | Client | Detailed order view in `<Sheet>`. |
| `src/components/admin/StatusSelect.tsx` | Client | Status dropdown that calls Server Action on change. |
| `src/components/structured-data/LocalBusiness.tsx` | Server | Renders `<script type="application/ld+json">` on homepage. |
| `src/components/structured-data/MenuItem.tsx` | Server | Renders product JSON-LD. |

### Server Actions

```ts
// src/app/admin/orders/actions.ts
'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'

const updateStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled']),
})

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin()   // throws redirect('/') if not admin
  const parsed = updateStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('orders')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.orderId)

  if (error) return { error: 'Update failed. Try again.' }

  if (parsed.data.status === 'out_for_delivery') {
    // fetch order email and notify customer
    // ...
  }

  return { success: true }
}
```

```ts
// src/lib/auth/require-admin.ts
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (role?.role !== 'admin') redirect('/')
}
```

---

## New Supabase Tables

```sql
CREATE TABLE promo_codes (
  code             text PRIMARY KEY,
  discount_type    text NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value   numeric(6,2) NOT NULL,
  min_order_aed    numeric(6,2) NOT NULL DEFAULT 0,
  max_uses         int,
  uses_count       int NOT NULL DEFAULT 0,
  expires_at       timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE delivery_zones (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_name      text NOT NULL,
  fee_aed        numeric(6,2) NOT NULL,
  min_order_aed  numeric(6,2) NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true
);

-- Seed delivery zones
INSERT INTO delivery_zones (area_name, fee_aed, min_order_aed) VALUES
  ('Al Jurf 2', 5.00, 20.00),
  ('Al Jurf 1', 5.00, 20.00),
  ('Al Jurf 3', 5.00, 20.00),
  ('Ajman City Centre', 10.00, 25.00),
  ('Al Rashidiya', 10.00, 25.00);
```

---

## Auth Requirements

| Route | Auth | Rule |
|-------|------|------|
| `/admin/*` | Required + admin role | `requireAdmin()` in layout |

---

## Performance Targets (Lighthouse, production URL)

| Metric | Target |
|--------|--------|
| Performance | >= 90 |
| Accessibility | >= 95 |
| Best Practices | >= 95 |
| SEO | 100 |
| LCP (homepage) | < 2.5s (3G) |
| CLS | < 0.05 |
| TBT | < 200ms |

---

## Test Plan

### Manual QA
- [ ] Log in as admin user. `/admin/orders` renders. Non-admin user sees access denied.
- [ ] Test order appears in admin table. Change status to "Preparing". Supabase row updated. `/track` shows "Preparing".
- [ ] Change to "Out for delivery". Customer notification email sent to test inbox.
- [ ] `sitemap.xml` at `/sitemap.xml` contains all 23 product URLs. No admin/account URLs.
- [ ] `robots.txt` at `/robots.txt` disallows `/admin`, `/account`, `/api`.
- [ ] Google Rich Results Test on homepage: no errors on LocalBusiness schema.
- [ ] WhatsApp link preview on `napoli7.com/`: shows OG image, title, description.
- [ ] Promo code "WELCOME" at checkout: 29.00 AED discount applied. Total recalculates.
- [ ] Invalid promo "FAKE": "Code not valid or expired."
- [ ] Delivery area "Al Jurf 2": 5.00 AED fee shown in checkout summary.
- [ ] Delivery area "Unknown area": "Delivery not available — choose pickup."
- [ ] Lighthouse run on production URL: Performance >= 90, SEO = 100.
- [ ] `next build` exits 0. `tsc --noEmit` exits 0.

---

## Accessibility Audit (remediations from Phase 1–4 issues found here)

- [ ] Run axe-core on all public pages (via browser extension or automated). Zero critical/serious violations.
- [ ] Screen reader test (VoiceOver/NVDA): home, menu, product detail, checkout, track.
- [ ] Tab order logical on all forms.
- [ ] Skip-to-content link visible on focus, functional on all pages.
- [ ] All images: alt text verified correct and descriptive (not filename).
- [ ] Focus ring visible on all interactive elements in all states.

---

## Definition of Done

- [ ] Admin can update order statuses. Customer `/track` reflects updates.
- [ ] `sitemap.xml` and `robots.txt` correct.
- [ ] Structured data validated by Google Rich Results Test.
- [ ] OG images render correctly on WhatsApp and Twitter preview tools.
- [ ] Vercel Analytics active and recording data.
- [ ] Brand photography in place (or owner has formally deferred to a post-launch swap).
- [ ] Lighthouse Performance >= 90, SEO = 100 on production.
- [ ] Zero axe-core critical/serious violations.
- [ ] Owner confirms: "Ready to go live."
- [ ] `next build` exits 0.

---

## Out of Scope / Deferred

- Arabic locale — Phase 6.
- Realtime order updates via Supabase Realtime — Phase 6 if owner requests.
- Kitchen display tablet app — separate product.
- Loyalty / rewards system — Phase 6.
