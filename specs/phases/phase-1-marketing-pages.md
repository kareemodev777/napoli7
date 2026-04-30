# Phase 1 — Marketing & Content Pages

**Effort**: 2–3 working days
**Gate**: Visual review and owner approval of all 8 routes before Phase 2 begins.
**Dependencies**: Homepage already shipped. No backend required.

---

## Goal

Ship all static/content pages of the v2 sitemap as pure UI — no Supabase, no auth, no cart logic. Every route is deployable and demoable. Mock data is hardcoded inline or in simple TypeScript constants. The owner can share the Vercel preview URL and approve each page before any backend work begins.

---

## Scope

### In

- `/deals` — welcome offer + static deal cards structure
- `/about` — full story, philosophy, 4-tile feature row
- `/location` — address, hours, phone, WhatsApp, Google Maps embed, delivery zone note
- `/contact` — contact details, contact form (client-side only, no submission in Phase 1), FAQ accordion
- `/delivery` — delivery information content page
- `/legal/privacy` — privacy policy document
- `/legal/terms` — terms and conditions document
- `/legal/refund` — refund and cancellation policy document
- `loading.tsx` for each new route
- `not-found.tsx` global custom 404
- `error.tsx` global error boundary
- Skip-to-content link in `src/app/layout.tsx`
- Per-page `<Metadata>` and Open Graph tags

### Out

- Contact form submission (deferred to Phase 3 when server actions exist)
- Google Maps JavaScript API (use static embed iframe only)
- Any Supabase reads
- Cart, checkout, account flows
- Menu catalog (Phase 2)

---

## User Stories

### US-1.1 Deals page
**As** a customer landing on `/deals`,
**I want** to see the "First Pizza on us" welcome offer with its conditions clearly listed,
**so that** I know how to claim it.

Acceptance criteria:
- [ ] Page H1 reads "DEALS" in uppercase with letter-spacing 1.5px.
- [ ] Welcome offer card shows: offer title, description, conditions (one per person, pickup, signup required), and a primary navy CTA "Order Now" linking to `/menu`.
- [ ] A note reads: "Offers available for takeout and delivery orders only."
- [ ] Page renders without JavaScript (Server Component).
- [ ] Open Graph title resolves to "Deals · Napoli 7".

### US-1.2 About page
**As** a customer curious about the brand,
**I want** to read the Napoli 7 story — founder origin, Naples connection, lievito madre, schiaffo technique, the oven — laid out in a readable, visually distinct page,
**so that** I trust the product before ordering.

Acceptance criteria:
- [ ] Page H1 reads "ABOUT" or "OUR STORY" (UPPERCASE, 1.5px letter-spacing).
- [ ] Three distinct content sections present: (1) Founder story + Naples roots, (2) Craft detail (flour/tomatoes/oven/technique), (3) Philosophy of seven.
- [ ] "What Makes Us Special" 4-tile row present (Wood-fired / Fresh Ingredients / Fast Delivery / Hygiene First) using `<Flame>`, `<Leaf>`, `<Clock>`, `<ShieldCheck>` from lucide-react at 32px, navy color.
- [ ] All tiles use the same background treatment (either all white or all `--color-bg-subtle`). No mixing.
- [ ] Foreign words (*lievito madre*, *schiaffo napoletano*) are italicized on first appearance.
- [ ] No exclamation marks in any copy.
- [ ] Mobile: sections stack single-column. Desktop: story + image 2-column layout.

### US-1.3 Location page
**As** a customer wanting to visit or check the delivery zone,
**I want** to see the full address, opening hours, phone numbers, and a map,
**so that** I can navigate there or call.

Acceptance criteria:
- [ ] Address block present: "Shop 4, opposite Delta Supermarket, 213 Sheikh Rashid bin Abdul Aziz St, Al Jurf 2, Ajman."
- [ ] Opening hours present: "Open daily, 11:00 – 22:00."
- [ ] Phone: "+971 6 534 5772" as `<a href="tel:...">`.
- [ ] WhatsApp: "+971 50 162 8577" as `<a href="https://wa.me/971501628577">` with `<MessageCircle>` icon (lucide).
- [ ] Email: "info@napoli7.com" as `<a href="mailto:...">`.
- [ ] Google Maps embed: `<iframe>` sourced from `https://maps.google.com/maps?q=25.4002327,55.5033167&...&output=embed`. Width 100%, height 400px on desktop, 280px on mobile.
- [ ] A note about delivery zone: "We currently deliver to selected areas of Al Jurf and surrounding neighbourhoods. Outside our zone? Order for pickup."
- [ ] Directions CTA links to `https://maps.google.com/?q=25.4002327,55.5033167`.

### US-1.4 Contact page
**As** a customer with a question,
**I want** to see contact details, a form, and an FAQ,
**so that** I can reach the team without hunting.

Acceptance criteria:
- [ ] Contact details block: phone, WhatsApp, email, address, hours — all match `/location` values exactly.
- [ ] Contact form fields: Name (text), Phone (tel), Email (email), Message (textarea, max 500 chars). All labelled per DESIGN.md §6 Forms spec (12px UPPERCASE label, 6px gap, required asterisk).
- [ ] Form submit button: primary navy "SEND MESSAGE".
- [ ] In Phase 1, form submission triggers a client-side `alert` or inline "Message received" text — no actual server action yet.
- [ ] FAQ accordion: 7 items from SITEMAP.md contact section. Uses shadcn `<Accordion>` primitive. Only one item open at a time.
- [ ] FAQ IDs allow deep-linking: `#faq` anchor. Footer "FAQs" link (`/contact#faq`) scrolls correctly.
- [ ] Keyboard navigable: accordion items reachable by Tab + Enter/Space.

### US-1.5 Delivery information page
**As** a customer checking delivery options,
**I want** a clear, scannable page covering zone, time, fees, and disclaimers,
**so that** I have no surprises at checkout.

Acceptance criteria:
- [ ] Sections present: Service area, Estimated time, Delivery fee, Minimum order, Modifications policy, Arrival protocol, Disclaimers — all from SITEMAP.md §Delivery Information.
- [ ] Each section is an `<h2>` (UPPERCASE, 1.5px tracking) + body paragraphs.
- [ ] Primary CTA "Order Now" links to `/menu`.

### US-1.6 Legal pages (three)
**As** a customer reading policy documents,
**I want** three clearly separated legal documents — Privacy Policy, Terms & Conditions, Refund & Cancellation — not duplicated across pages,
**so that** I understand my rights.

Acceptance criteria:
- [ ] `/legal/privacy` — real privacy/data handling policy. Covers: data collected, purpose, retention, third parties (Supabase, Stripe, Resend), user rights, contact.
- [ ] `/legal/terms` — terms and conditions. Covers all 12 sections from the current site's mislabeled `/privacy-policy-2/` content, properly titled.
- [ ] `/legal/refund` — refund and cancellation policy. Covers all content from current `/refund-cancellation-policy/` page.
- [ ] Each page has a distinct `<h1>` and `<title>`. No page shares another page's content.
- [ ] Last updated date present on each document (hardcoded: "Last updated 1 May 2026").
- [ ] Legal nav: each page has a horizontal pill row at the top linking to the other two legal pages.
- [ ] 65ch max line length on body prose.

### US-1.7 Custom 404
**As** a customer hitting a broken or mistyped URL,
**I want** a clean 404 page that offers obvious next steps,
**so that** I don't bounce.

Acceptance criteria:
- [ ] `src/app/not-found.tsx` present.
- [ ] H1 reads "Page not found" (NOT "404 Error" — follow DESIGN.md voice).
- [ ] Two CTAs: "View Menu" (primary navy) + "Go Home" (secondary outline).
- [ ] Consistent Header and Footer rendered around the not-found content.

---

## Routes Added

| Path | File | Description |
|------|------|-------------|
| `/deals` | `src/app/deals/page.tsx` | Deals and welcome offer |
| `/about` | `src/app/about/page.tsx` | Brand story and philosophy |
| `/location` | `src/app/location/page.tsx` | Address, hours, map, directions |
| `/contact` | `src/app/contact/page.tsx` | Contact form + FAQ accordion |
| `/delivery` | `src/app/delivery/page.tsx` | Delivery information |
| `/legal/privacy` | `src/app/legal/privacy/page.tsx` | Privacy policy |
| `/legal/terms` | `src/app/legal/terms/page.tsx` | Terms and conditions |
| `/legal/refund` | `src/app/legal/refund/page.tsx` | Refund and cancellation |
| — | `src/app/not-found.tsx` | Global 404 |
| — | `src/app/error.tsx` | Global error boundary |
| — | `src/app/loading.tsx` | Global loading fallback |
| — | `src/app/deals/loading.tsx` | Per-route loading |
| — | `src/app/about/loading.tsx` | Per-route loading |
| — | `src/app/location/loading.tsx` | Per-route loading |
| — | `src/app/contact/loading.tsx` | Per-route loading |

---

## Components to Build

| File | Type | Notes |
|------|------|-------|
| `src/components/site/PageHero.tsx` | Server | Reusable page header: eyebrow + H1 UPPERCASE + optional sub. Used on all content pages. |
| `src/components/site/FeatureTiles.tsx` | Server | 4-tile "What Makes Us Special" row. Accepts icon + title + description array. |
| `src/components/site/FaqAccordion.tsx` | Client | Wraps shadcn `<Accordion>`. Accepts `{q, a}[]`. |
| `src/components/site/ContactForm.tsx` | Client | Form state with `useState`. Phase 1: no server action. |
| `src/components/site/LegalNav.tsx` | Server | Pill links between the three legal pages. |
| `src/components/site/MapEmbed.tsx` | Server | `<iframe>` wrapper with loading="lazy" and aspect-ratio container. |
| `src/app/not-found.tsx` | Server | Custom 404 with Header + Footer. |
| `src/app/error.tsx` | Client | `'use client'` error boundary. |

### shadcn components to install
```bash
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add accordion -y
```
`<Accordion>`, `<AccordionItem>`, `<AccordionTrigger>`, `<AccordionContent>` — used in `FaqAccordion`.

---

## Data Model

No database. All content is static TypeScript constants:

```ts
// src/data/mock/deals.ts
export const WELCOME_OFFER = {
  slug: 'first-pizza-on-us',
  title: 'Your First Neapolitan Pizza Is On Us',
  description: 'Sign up at Napoli 7 and your first Margherita is complimentary for pickup. Upgrade to any other pizza by paying the price difference.',
  conditions: [
    'One per person.',
    'Available for pickup only.',
    'Exclusively via napoli7.com signup.',
    'Offers available for takeout and delivery orders only.',
  ],
  cta: { label: 'Order Now', href: '/menu' },
}

// src/data/mock/faq.ts
export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'What makes Napoli 7 pizza special?', a: '...' },
  { q: 'Do you offer takeaway and delivery?', a: '...' },
  // ... 7 items from SITEMAP.md
]
```

---

## API Routes / Server Actions

None in Phase 1. Contact form is client-side only.

---

## Auth Requirements

None. All Phase 1 routes are public.

---

## Cache Strategy

All Phase 1 pages are static Server Components. Next.js 16 will statically render them at build time (no `use cache` directive needed — they have no dynamic data sources). Each route gets ISR revalidation of 86400s as a safety net.

```ts
// at top of each page.tsx
export const revalidate = 86400
```

---

## SEO

Each page exports a `generateMetadata` function:

```ts
// example: src/app/about/page.tsx
export const metadata: Metadata = {
  title: 'About — Our Story',
  description: 'Napoli 7 is built on Neapolitan tradition: Caputo flour, San Marzano DOP, lievito madre, a 450°C oven, and the philosophy of doing seven pizzas perfectly.',
  openGraph: {
    title: 'About Napoli 7',
    description: '...',
    images: [{ url: '/images/og-about.jpg', width: 1200, height: 630 }],
  },
}
```

OG images use `/images/` static files (existing article photos as placeholders).

`sitemap.xml` and `robots.txt` are added in Phase 5 once all routes exist.

---

## i18n Structure

All copy must be extracted to `src/i18n/en.json` from day one:

```json
{
  "deals": {
    "heading": "Deals",
    "welcomeOffer": { ... }
  },
  "about": {
    "heading": "Our Story",
    ...
  }
}
```

No `next-intl` or translation library in Phase 1 — the JSON file is the single source of truth for copy. The AR locale will be wired in Phase 6.

---

## Test Plan

### Manual QA checklist (must pass before approval)
- [ ] All 8 routes render without console errors at `/deals`, `/about`, `/location`, `/contact`, `/delivery`, `/legal/privacy`, `/legal/terms`, `/legal/refund`.
- [ ] 404 at `/not-a-real-page` renders `not-found.tsx` with Header + Footer.
- [ ] Mobile 390px: all pages readable, no horizontal scroll, tap targets >= 44px.
- [ ] Tablet 768px: layout shifts appropriately.
- [ ] Desktop 1280px: max container width holds at 1140px.
- [ ] Header nav links to each route — no broken hrefs.
- [ ] Footer links to `/legal/*` and `/contact#faq` resolve.
- [ ] `/contact#faq` anchor scroll works on page load.
- [ ] FAQ accordion: only one item open at a time; keyboard navigable.
- [ ] Google Maps iframe loads (may show placeholder if API key not set — acceptable in Phase 1).
- [ ] No emoji in any rendered output.
- [ ] No gradient in any rendered output.
- [ ] All H1/H2 are UPPERCASE with letter-spacing.
- [ ] `prefers-reduced-motion`: no transforms fire.
- [ ] Run `npx tsc --noEmit` — zero errors.
- [ ] Run `npx eslint src/` — zero errors.
- [ ] Run `next build` — exits 0.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| LCP (static content pages) | < 1.5s on 3G |
| CLS | < 0.05 |
| Page weight (HTML + CSS + JS) | < 80KB per route |
| Image weight | 0 (no new images in Phase 1; existing hero/article images only on homepage) |

---

## Accessibility Checklist

- [ ] Skip-to-content link added to `src/app/layout.tsx` (visually hidden, visible on focus).
- [ ] All `<a>` tags have discernible text or `aria-label`.
- [ ] FAQ accordion items have correct `aria-expanded` (handled by shadcn `<Accordion>`).
- [ ] Map iframe has `title="Napoli 7 location map"`.
- [ ] Contact form: all inputs have associated `<label>` elements (not aria-label).
- [ ] Color contrast: all body text passes AA. All headings pass AAA.
- [ ] Focus ring visible on all interactive elements (2px navy ring per DESIGN.md §11).

---

## Definition of Done

- [ ] All 8 routes deployed to Vercel preview URL.
- [ ] Owner has reviewed each page and confirmed visual approval.
- [ ] `next build` exits 0.
- [ ] `tsc --noEmit` exits 0.
- [ ] All manual QA checklist items checked.
- [ ] No DESIGN.md bans violated (confirmed by builder and reviewer).

---

## Out of Scope / Deferred

- Contact form server submission — Phase 3.
- Google Maps JavaScript API interactive map — Phase 5.
- Legal document legal review (owner's responsibility).
- Arabic locale — Phase 6.
- Sitemap.xml — Phase 5.
