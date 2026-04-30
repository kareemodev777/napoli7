# Spec: Mobile-First Responsive Navigation & Site Polish

## Status: Implemented

## Objective
Make Napoli 7 fully mobile-friendly across every page. Replace the missing
mobile header navigation with an "app-like" experience: a hamburger-triggered
full-screen drawer for primary nav, plus a sticky bottom action bar for the
two highest-frequency mobile actions (Order, Cart). Audit and tighten every
breakpoint so the Dieci/Swiss aesthetic survives on a 360-wide screen.

## Background
- `src/components/site/Header.tsx:20` hides the entire `<nav>` with
  `hidden lg:flex` and ships **no mobile replacement** — on every viewport
  below 1024px the user has no way to navigate.
- Mobile users currently only see: logo, language toggle (md+), account
  icon, cart icon. No way to reach `/menu`, `/deals`, `/about`, `/track`,
  `/location`, or `/contact` from the header.
- The brand voice is Swiss-Italian (Dieci-derived), so the mobile pattern
  has to stay sharp-cornered, type-led, and disciplined — not a bouncy
  drawer with rounded corners and emoji icons. See `docs/DESIGN.md` and
  `memory/project_napoli7.md`.
- The user explicitly asked for "navigation mobile app" feel — that maps
  to two well-known native patterns we can fuse without breaking the
  aesthetic: a **full-bleed type-led drawer** (top trigger) and a
  **persistent bottom action bar** (Order + Cart) for primary commerce
  actions.

## Current State

| Area | File | Mobile behavior today |
|------|------|----------------------|
| Header nav | `src/components/site/Header.tsx` | Nav links `hidden lg:flex` — no trigger, no drawer. Language toggle hidden below `md`. |
| Site shell | `src/components/site/SiteShell.tsx` | Plain header/main/footer wrapper. No mobile chrome. |
| Hero widget | `src/components/site/Hero.tsx` | Already uses `svh` heights and `max-w-sm` widget — broadly OK but the rotated "First Pizza on us" badge collides with the widget on narrow phones. |
| Menu page | `src/app/menu/page.tsx` + `src/components/catalog/MenuLayout.tsx` | Right-rail cart hidden < lg; sticky category nav at top works on mobile. A floating "view cart" pill appears bottom-center when cart has items. This pill **must coexist** with the new bottom action bar. |
| Menu category nav | `src/components/catalog/MenuCategoryNav.tsx` | Sticky `top-0` — works, but will collide with a sticky header. Needs `top-[--header-h]` once header becomes sticky on mobile. |
| Footer | `src/components/site/Footer.tsx` | `grid md:grid-cols-4` — collapses to single column < md. Padding and type sizes are OK; no changes required. |
| Globals | `src/app/globals.css` | No mobile-specific tokens (header height, safe-area insets). |
| Other pages | `src/app/{about,contact,location,deals,track,delivery,legal/*,login,register,account,checkout,cart,order}/...` | Have not been audited for sub-`md` issues yet. Most use `PageHero` + content blocks — should be checked but likely fine after header changes. |

The "mobile menu is not displayed" the user reports = the header nav
literally has no mobile trigger; cart and account icons render but the
six nav links are gone.

## Proposed Changes

### Strategy
1. **Mobile header (sticky, < lg)** — Logo on the left, hamburger + cart on
   the right. Same height as desktop header so the brand reads
   identically.
2. **Hamburger drawer (< lg)** — full-screen panel that slides in from the
   right. Top: close (X) and language pill. Body: nav links rendered as
   large display-type rows (`text-3xl uppercase tracking-[0.05em]`,
   left-aligned, divided by `border-b border-border`). Footer of the
   drawer: Login pill, phone, WhatsApp, hours. Locks body scroll while
   open. ESC closes. Click outside closes. Closes automatically on route
   change.
3. **Bottom action bar (< lg, on commerce-relevant pages)** — A sticky
   bar at `bottom-0` with two segments: an arrow-CTA "Order" linking to
   `/menu` and a Cart pill (icon + count + subtotal). Respects
   `env(safe-area-inset-bottom)`. Hides on `/checkout`, `/cart`, and
   `/order/*` to avoid double-CTA.
4. **Coexistence with the existing `MobileCartDrawer` pill** — the
   floating "view cart" pill in `MenuLayout` already lives bottom-center.
   Replace its visual with the canonical bottom action bar so mobile
   users see exactly one cart affordance.
5. **Responsive audit pass** — sweep every page at 360 / 414 / 768 and
   fix any horizontal overflow, cramped padding, or unreadable type. The
   Hero badge collision is the only known hot spot; the rest is
   verification.

### Files to Create
| File | Purpose |
|------|---------|
| `src/components/site/MobileNav.tsx` | Client component. Hamburger trigger + full-screen drawer. Manages open/close, route-change auto-close, body-scroll lock, focus trap. |
| `src/components/site/MobileBottomBar.tsx` | Client component. Sticky bottom action bar (Order CTA + Cart). Reads cart store; subscribes to `useMounted` to avoid hydration mismatch. Accepts an optional `hidden` prop or detects path via `usePathname` to suppress on cart/checkout/order pages. |
| `src/lib/use-body-scroll-lock.ts` | Tiny hook to lock `<body>` scroll while a drawer is open (sets `overflow-hidden` and compensates for scrollbar). |
| `src/lib/use-route-change.ts` | Hook that fires a callback when `usePathname()` changes — used to auto-close the drawer on navigation. |

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/site/Header.tsx` | Make the header `sticky top-0 z-40` on mobile; render `<MobileNav />` (visible `< lg`) replacing the missing nav. Hide the standalone account icon < lg (it moves into the drawer footer). Keep the `<CartIcon />` visible in the header on `lg+` only — on mobile the cart lives in the bottom bar. Add a `data-header` attribute so other sticky elements can offset off it. |
| `src/components/site/SiteShell.tsx` | Render `<MobileBottomBar />` after `<Footer />`. |
| `src/app/page.tsx` and `src/app/menu/page.tsx` (and any page that bypasses `SiteShell`) | Add `<MobileBottomBar />` so it's available on every page that uses `<Header />` directly. Either standardize on `SiteShell` or import `MobileBottomBar` per-page. Decision: standardize on `SiteShell` where possible; for pages that need bespoke layout, import `MobileBottomBar` directly. |
| `src/components/catalog/MenuLayout.tsx` | Remove the in-file `MobileCartDrawer` (its job is now done by `MobileBottomBar`). Keep the right-rail `<CartSidebar />` for `lg+`. Make sure category sections still get bottom-padding so the bottom bar doesn't cover the last "Add" button — add `pb-24 lg:pb-0` to the outer grid. |
| `src/components/catalog/MenuCategoryNav.tsx` | Change sticky offset from `top-0` to `top-[--header-h]` (or `top-14 lg:top-0`) so it sits below the now-sticky mobile header. |
| `src/components/site/Hero.tsx` | Move the "First Pizza on us" sticker from `bottom-8` to `bottom-4` and shrink to `w-[110px] h-[110px]` < `sm` so it doesn't overlap the central widget on a 360px screen. Reposition to `right-3` on `< sm`. |
| `src/components/cart/CartIcon.tsx` | Add `hidden lg:inline-flex` (cart moves to bottom bar on mobile). |
| `src/app/globals.css` | Add `--header-h: 56px;` (mobile) / `--header-h: 76px;` (lg+) tokens. Add a `.safe-bottom { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }` utility used by the bottom bar. Add `.bottom-bar-spacer` utility (`pb-[88px] lg:pb-0`) for pages that render the bottom bar. Add a small `body[data-scroll-lock]` rule as a fallback for the scroll-lock hook. |
| `src/components/site/Footer.tsx` | Add `pb-[88px] lg:pb-0` so the bottom bar doesn't sit on top of the copyright row. |

### Drawer content (what shows in `MobileNav`)
- Primary nav: Menu, Deals, About, Track Order, Location, Contact — full-width rows, `text-3xl font-display uppercase tracking-[1.5px]`, divided by `border-b border-border`, 64px row height, ▸ chevron right-aligned.
- Secondary links: Account / Login (single row, smaller type).
- Contact strip: Phone (tel:), WhatsApp (wa.me), hours "Open daily 11–22".
- Language toggle pill (EN, AR planned later).
- Closes on: X tap, backdrop tap, ESC key, route change.

### Bottom bar content (`MobileBottomBar`)
- Left segment: arrow-CTA "Order" linking to `/menu`. Uses the existing
  `.arrow-btn` styling, height ~52px (slightly shorter than desktop).
- Right segment: Cart pill — `<ShoppingBag>` icon + total qty + subtotal
  (when qty > 0). Tapping opens `/cart`. When qty = 0, the right segment
  is just the icon (no badge, no subtotal).
- Suppressed on: `/cart`, `/checkout/*`, `/order/*`, `/login`, `/register`.

### Visual rules (non-negotiable)
- 0px corners. No rounded buttons, no rounded drawers.
- Inter Tight display + Inter body — same as desktop.
- No emojis, no gradient text, no soft pastel fills.
- No motion fluff: drawer slides in 220ms `cubic-bezier(0.2, 0, 0, 1)`,
  backdrop fades 180ms, that's all.
- Lucide SVG icons only.
- All tap targets ≥ 44×44 (already used in `MenuCategoryNav`).

## Implementation Steps
- [ ] Step 1: Add `--header-h` and `safe-bottom` tokens / utilities in
      `globals.css`.
- [ ] Step 2: Create `src/lib/use-body-scroll-lock.ts` and
      `src/lib/use-route-change.ts`.
- [ ] Step 3: Build `src/components/site/MobileNav.tsx` (trigger +
      drawer + focus trap + ESC + backdrop). Ship it standalone.
- [ ] Step 4: Wire `MobileNav` into `Header.tsx`. Make header sticky
      and the right-side icons mobile-aware (hide standalone account
      icon and `CartIcon` < lg). Verify visual at 360 / 414 / 768.
- [ ] Step 5: Build `src/components/site/MobileBottomBar.tsx`. Use
      `usePathname()` to suppress on cart/checkout/order/login/register.
      Use `useCart` + `useMounted` to avoid hydration mismatch.
- [ ] Step 6: Render `MobileBottomBar` in `SiteShell` and audit each
      page to ensure they go through `SiteShell` or import the bar
      directly. Add `pb-[88px] lg:pb-0` to `Footer`.
- [ ] Step 7: Refactor `MenuLayout`: remove `MobileCartDrawer`, add
      bottom padding to compensate for the bar.
- [ ] Step 8: Adjust `MenuCategoryNav` sticky offset to `top-[--header-h]`.
- [ ] Step 9: Adjust `Hero` sticker positioning for `< sm` so it doesn't
      collide with the central widget.
- [ ] Step 10: Responsive sweep at 360 / 414 / 768. Fix any horizontal
      scroll, overflowing card actions on `MenuProductCard`, cramped
      padding on `PageHero`, footer link wrapping, contact form, and
      legal pages.
- [ ] Step 11: Lint / typecheck / build / dev-server smoke test.

## Testing Strategy
- [ ] Manual viewport sweep at 360, 414, 768, 1024, 1280, 1500 — every
      route in the site.
- [ ] Drawer behavior: ESC closes, backdrop tap closes, route change
      closes, body scroll locked, focus returns to trigger on close.
- [ ] Bottom bar: hidden on `/cart`, `/checkout`, `/order`, `/login`,
      `/register`. Subtotal/qty update reactively. Safe-area inset
      respected on iOS notch (verified via Safari responsive mode).
- [ ] Menu: category sticky nav remains visible below the sticky header
      and never overlaps the section heading. The last product card's
      Add button is reachable above the bottom bar.
- [ ] No hydration warnings (cart count must come through `useMounted`).
- [ ] Lighthouse mobile run on `/` and `/menu` — accessibility ≥ 95,
      no horizontal-scroll flag.
- [ ] Keyboard nav: Tab order is logical, drawer trap works, no
      focus-able elements behind the open drawer.

## Risks & Considerations
- **Hydration mismatch on bottom bar / cart icon** — guard with
  `useMounted` (already done in `CartIcon` and `MobileCartDrawer`).
  Mitigation: copy the same pattern.
- **Two cart UIs at once** — easy to ship the bottom bar without
  removing the existing `MobileCartDrawer`. Mitigation: explicit step
  (Step 7) deletes it.
- **Sticky header + sticky category nav stacking** — addressed via
  `--header-h` token and `top-[--header-h]` on `MenuCategoryNav`.
- **Pages that don't use `SiteShell`** (`page.tsx`, `menu/page.tsx`
  render `<Header />` + `<Footer />` directly). Mitigation: either
  switch them to `SiteShell` in this pass or render `MobileBottomBar`
  in each page. Recommend the `SiteShell` standardization for
  long-term consistency, but do it in a follow-up if the diff grows
  too large.
- **Drawer animation perf on low-end Android** — keep transforms
  GPU-friendly (`translate3d`), avoid box-shadow during the slide.
- **Focus trap library choice** — write a minimal trap inline rather
  than pulling in `focus-trap-react` to keep bundle size flat.
- **Right-to-left (Arabic) future support** — drawer slides from the
  right today; revisit when AR ships. Out of scope here.

## Acceptance Criteria
- [ ] On every viewport `< 1024px`, the header shows a hamburger that
      opens a full-screen drawer with all six primary nav links plus
      Account, language, phone, WhatsApp, and hours.
- [ ] On every commerce-relevant page `< 1024px`, a sticky bottom bar
      with Order CTA + Cart pill is present and respects the iOS safe
      area.
- [ ] Bottom bar is **suppressed** on `/cart`, `/checkout/*`,
      `/order/*`, `/login`, `/register`.
- [ ] No horizontal scroll on any page at 360px width.
- [ ] No emojis, no rounded corners, no gradient text — design tokens
      from `globals.css` only.
- [ ] Drawer closes on ESC, backdrop tap, and route change; focus is
      trapped while open and restored on close.
- [ ] Menu page's sticky category nav sits flush below the sticky
      mobile header; the last "Add" button is tappable without the
      bottom bar covering it.
- [ ] Lint, typecheck, and `next build` all pass.
- [ ] Lighthouse mobile a11y ≥ 95 on `/` and `/menu`.
