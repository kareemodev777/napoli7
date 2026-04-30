# Phase 2 — Menu Catalog (UI + Mock Data)

**Effort**: 2–3 working days
**Gate**: Owner approves product card design and product detail page before Phase 3 begins.
**Dependencies**: Phase 1 complete (Header, Footer, PageHero patterns established).

---

## Goal

Build the full menu browsing experience — catalog grid and product detail pages — against a local TypeScript mock data file that mirrors the Supabase schema exactly. After approval, Phase 3 connects these same components to Supabase with Cache Components and zero UI changes. The 23-SKU catalog is fully browsable and looks production-ready by the end of this phase.

---

## Scope

### In

- `/menu` — full catalog, category filter tabs (All / Pizza / Focaccia / Dessert / Drinks)
- `/menu/pizza`, `/menu/focaccia`, `/menu/dessert`, `/menu/drinks` — category sub-routes (redirect to `/menu?category=X` OR dedicated layout pages — see note below)
- `/menu/[slug]` — product detail page (23 pages pre-generated)
- Product card component with image, name, italic foreign name, description (2-line), price, veg/spicy dots, "Add" button
- Customization UI on product detail (per-ingredient radio: Default / Extra +X AED / Without)
- Quantity stepper component
- Related products strip (3 items, same category or cross-category)
- Category description eyebrow on grid
- `generateStaticParams` for all 23 slugs
- `loading.tsx` for `/menu` and `/menu/[slug]`

### Out

- Actual cart writes (Add button is wired to `console.log` in Phase 2; full cart store in Phase 3)
- Supabase reads (Phase 3)
- Reviews/ratings (deferred — no data exists)
- Search / text filter (deferred to Phase 5)
- Allergen / nutrition data (content not available)

---

## Route Design Note

The v2 sitemap specifies `/menu/pizza` etc. as sub-routes. Two valid implementations:

- **Option A**: `/menu/[category]/page.tsx` — category as a dynamic segment. `/menu` itself is `src/app/menu/page.tsx` showing all. This creates clean URLs.
- **Option B**: `/menu/page.tsx` with a URL-encoded `?category=pizza` filter and client-side filtering. Simpler but less SEO-friendly.

**Decision**: Use Option A. Category pages are Server Components that filter the mock data array. Slug pages at `/menu/[slug]` must not conflict with category names — the slug values are kebab-case product names (`margherita-classic`, not `pizza`) so there is no collision risk.

Concrete file structure:
```
src/app/menu/
  page.tsx                    # All products (defaults to showing all)
  layout.tsx                  # Shared menu layout (category nav)
  loading.tsx
  [slug]/
    page.tsx                  # Product detail
    loading.tsx
```

The category filter tabs on `/menu` update the URL with `?category=pizza` using `useRouter`; the server re-renders the grid SSR-style. Alternatively, the category filter is a client component that filters the already-loaded products array in memory. Use **in-memory client filter** in Phase 2 for simplicity — Supabase pagination replaces this in Phase 3.

---

## User Stories

### US-2.1 Browse all products
**As** a customer on `/menu`,
**I want** to see all 23 products in a grid with category tabs,
**so that** I can browse and decide what to order.

Acceptance criteria:
- [ ] Page H1 reads "MENU" (UPPERCASE, 1.5px letter-spacing).
- [ ] Category tabs present: All / Pizza / Focaccia / Dessert / Drinks. Clicking a tab filters the grid without a page reload.
- [ ] Active tab has 2px navy underline or solid navy bg (match DESIGN.md button secondary style — not a pill).
- [ ] Grid: 3 columns on desktop (>= 1024px), 2 on tablet (768–1023px), 1 on mobile (< 768px).
- [ ] All 23 products render with: image (4:3 ratio), product name, italic foreign name if present, 2-line description (ellipsis on overflow), price (e.g. "29.00 AED", tabular figures), "Add" button.
- [ ] Veg dot (8px green circle, `--color-flag-green`) on: Margherita Classic, Vegetable (Ortolana), Nutella Pizza, Lotus Biscoff Pizza, Pistachio Pizza, Focaccia Sandwich Vegetables, all 8 drinks.
- [ ] Spicy dot (8px red circle, `--color-flag-red`) on: Merguez, Spicy Peperoni (Diavola Piccante), Focaccia Sandwich Spicy Pepperoni.
- [ ] Dots are positioned top-right of the product image, not the card.
- [ ] "Add" button is full-width, primary navy, 0px radius.
- [ ] Card hover: `--shadow-sm` applied; no transform or lift.
- [ ] Category filter tabs are reachable by keyboard (Tab + Enter).

### US-2.2 View product detail
**As** a customer who has clicked a product card,
**I want** to see the full product detail — image, description, customization options, and add to cart — on a dedicated page,
**so that** I can configure my order before adding.

Acceptance criteria:
- [ ] Breadcrumb present: "Menu / [Category] / [Product Name]" as plain links.
- [ ] H1 is the product name. Category eyebrow above H1 (e.g. "PIZZA" in 12px UPPERCASE tracking).
- [ ] Price displayed: "49.00 AED" — `--text-price-lg` (22px), tabular, ink color.
- [ ] Long description: 2–3 paragraphs from mock data. Max 65ch line length.
- [ ] Customization section (for pizza only — not drinks):
  - Each ingredient listed as a row with radio group: Default | Extra +X AED | Without.
  - Radio group uses shadcn `<RadioGroup>` and `<RadioGroupItem>`.
  - "Extra" option shows the added price: "Extra +7.00 AED".
  - "Without" option removes ingredient.
  - Ingredients that cannot have "Extra" (no extra_price defined) do not show the Extra option.
- [ ] Ingredient chips: listed as small rectangular chips (0px radius, border `--color-border`) below the description, before customization.
- [ ] Quantity stepper: "-" button / number display / "+" button. Min 1, max 20. 44px touch targets.
- [ ] "ADD TO CART" button: full-width primary navy on mobile, auto-width on desktop. In Phase 2: clicks log to console and shows a brief "Added" state.
- [ ] Related products: 3-item horizontal strip at page bottom. Same category preferred; cross-category if fewer than 3 in same category.
- [ ] Desktop: 2-column layout (image left 55% / info right 45%). Mobile: stacked (image top, info below).
- [ ] Image: `next/image`, 4:3 ratio, `--radius-md` (4px) on corners.

### US-2.3 Product pages are statically generated
**As** a builder,
**I want** all 23 product pages generated at build time,
**so that** LCP is instant from CDN with no server compute per request.

Acceptance criteria:
- [ ] `generateStaticParams` returns all 23 slugs.
- [ ] `next build` output confirms 23 static product pages (no `ƒ` dynamic marker, shows `○` static or `●` SSG).
- [ ] Individual product `notFound()` is called if slug is not in the catalog.

---

## Routes Added

| Path | File | Type |
|------|------|------|
| `/menu` | `src/app/menu/page.tsx` | Server Component (RSC) |
| `/menu/[slug]` | `src/app/menu/[slug]/page.tsx` | SSG via `generateStaticParams` |
| `/menu/[slug]/loading` | `src/app/menu/[slug]/loading.tsx` | Suspense fallback |
| `/menu/loading` | `src/app/menu/loading.tsx` | Suspense fallback |

---

## Components to Build

| File | Type | Notes |
|------|------|-------|
| `src/components/catalog/ProductCard.tsx` | Server | Image, name, italicized foreign name, desc, price, veg/spicy dots, Add button. Accepts `Product` type. |
| `src/components/catalog/ProductGrid.tsx` | Client | Renders `ProductCard[]` with client-side category filter tabs. Receives all products as prop from Server parent. |
| `src/components/catalog/CategoryTabs.tsx` | Client | Filter tabs. Uses `useState` for active category. |
| `src/components/catalog/ProductDetail.tsx` | Client | Full detail layout. Manages customization state, quantity stepper, Add handler. |
| `src/components/catalog/CustomizationRow.tsx` | Client | Single ingredient row with `<RadioGroup>`. |
| `src/components/catalog/QuantityStepper.tsx` | Client | `-` / count / `+` with min/max. |
| `src/components/catalog/RelatedProducts.tsx` | Server | 3-item strip. Accepts `Product[]`. |
| `src/components/catalog/VegDot.tsx` | Server | 8px green circle. `aria-label="Vegetarian"`. |
| `src/components/catalog/SpicyDot.tsx` | Server | 8px red circle. `aria-label="Contains chilli"`. |
| `src/components/catalog/PriceBadge.tsx` | Server | Formats `29.00 AED` with tabular figures. |
| `src/components/catalog/Breadcrumb.tsx` | Server | 3-level breadcrumb. Will also serve checkout and account flows. |

### shadcn components to install
```bash
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add radio-group -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add badge -y
NPX_CONFIG_CACHE=/tmp/npm-cache npx shadcn@latest add separator -y
```

---

## Data Model

### TypeScript types (source of truth for Phase 3 Supabase schema)

```ts
// src/data/types/catalog.ts

export type CategoryId = 'pizza' | 'focaccia' | 'dessert' | 'drinks'

export interface Category {
  id: CategoryId
  label: string
  description: string
  position: number
}

export interface ProductCustomization {
  ingredient: string        // "Fior di latte mozzarella"
  extraPrice: number | null // null = cannot order extra
  removable: boolean
  position: number
}

export interface Product {
  id: string               // uuid (hardcoded in mock)
  slug: string             // e.g. "margherita-classic"
  categoryId: CategoryId
  name: string             // "Margherita Classic"
  nameIt: string | null    // "Margherita" (italic in UI)
  description: string
  price: number            // 29.00
  isVeg: boolean
  isSpicy: boolean
  isActive: boolean
  position: number
  imageUrl: string         // relative: "/images/products/margherita-classic.jpg"
  customizations: ProductCustomization[]
}
```

### Mock data file

```ts
// src/data/mock/catalog.ts
import type { Category, Product } from '@/data/types/catalog'

export const CATEGORIES: Category[] = [
  { id: 'pizza', label: 'Pizza', description: 'Artisan Neapolitan pizza — Caputo flour, San Marzano DOP tomatoes, lievito madre, handmade Neapolitan oven.', position: 0 },
  { id: 'focaccia', label: 'Focaccia', description: 'Focaccia sandwiches — same artisan dough, filled with premium ingredients.', position: 1 },
  { id: 'dessert', label: 'Dessert', description: 'Sweet pizzas to finish.', position: 2 },
  { id: 'drinks', label: 'Drinks', description: 'Cold drinks to accompany your meal.', position: 3 },
]

export const PRODUCTS: Product[] = [
  {
    id: '11111111-0000-0000-0000-000000000001',
    slug: 'margherita-classic',
    categoryId: 'pizza',
    name: 'Margherita Classic',
    nameIt: 'Margherita',
    description: 'Hand-stretched sourdough base, San Marzano DOP tomato sauce, fior di latte mozzarella, fresh basil, extra virgin olive oil. The benchmark by which all Neapolitan pizza is measured.',
    price: 29.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 0,
    imageUrl: '/images/products/margherita-classic.jpg',
    customizations: [
      { ingredient: 'San Marzano tomato sauce', extraPrice: 5.00, removable: true, position: 0 },
      { ingredient: 'Fior di latte mozzarella', extraPrice: 7.00, removable: true, position: 1 },
      { ingredient: 'Extra virgin olive oil', extraPrice: 2.00, removable: true, position: 2 },
      { ingredient: 'Fresh basil', extraPrice: 2.00, removable: true, position: 3 },
    ],
  },
  {
    id: '11111111-0000-0000-0000-000000000002',
    slug: 'vegetable-ortolana',
    categoryId: 'pizza',
    name: 'Vegetable',
    nameIt: 'Ortolana',
    description: 'A vibrant medley of grilled seasonal vegetables on San Marzano base with fior di latte. Fresh, colourful, and satisfying without compromise.',
    price: 38.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 1,
    imageUrl: '/images/products/vegetable-ortolana.jpg',
    customizations: [],
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    slug: 'merguez',
    categoryId: 'pizza',
    name: 'Merguez',
    nameIt: null,
    description: 'Bold, spiced merguez sausage on a San Marzano base with fior di latte. North African character, Neapolitan execution.',
    price: 39.00,
    isVeg: false,
    isSpicy: true,
    isActive: true,
    position: 2,
    imageUrl: '/images/products/merguez.jpg',
    customizations: [],
  },
  {
    id: '11111111-0000-0000-0000-000000000004',
    slug: 'diavola-piccante',
    categoryId: 'pizza',
    name: 'Spicy Peperoni',
    nameIt: 'Diavola Piccante',
    description: 'San Marzano, zesty Italian pepperoni, fior di latte. The heat is present but not overpowering — this is Neapolitan spice, not aggression.',
    price: 48.00,
    isVeg: false,
    isSpicy: true,
    isActive: true,
    position: 3,
    imageUrl: '/images/products/diavola-piccante.jpg',
    customizations: [],
  },
  {
    id: '11111111-0000-0000-0000-000000000005',
    slug: 'quattro-stagioni',
    categoryId: 'pizza',
    name: 'Four Season',
    nameIt: 'Quattro Stagioni',
    description: 'The Italian classic, divided into four sections, each with its own topping. Ham, artichoke, mushroom, olives. The whole year on one pizza.',
    price: 49.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 4,
    imageUrl: '/images/products/quattro-stagioni.jpg',
    customizations: [],
  },
  {
    id: '11111111-0000-0000-0000-000000000006',
    slug: 'bresaola-truffle',
    categoryId: 'pizza',
    name: 'Bresaola Truffle',
    nameIt: null,
    description: 'Air-dried bresaola, truffle oil, rucola, fior di latte on a white base. The most luxurious pizza on the menu — reserved for when the occasion calls for it.',
    price: 59.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 5,
    imageUrl: '/images/products/bresaola-truffle.jpg',
    customizations: [],
  },
  {
    id: '11111111-0000-0000-0000-000000000007',
    slug: 'prosciutto-rucola',
    categoryId: 'pizza',
    name: 'Prosciutto & Rucola',
    nameIt: null,
    description: 'Prosciutto crudo, wild rucola, cherry tomatoes, shaved Parmigiano. Added after baking, never cooked. This is how it is done in Naples.',
    price: 69.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 6,
    imageUrl: '/images/products/prosciutto-rucola.jpg',
    customizations: [],
  },
  // Focaccia (5 items)
  {
    id: '22222222-0000-0000-0000-000000000001',
    slug: 'focaccia-vegetables',
    categoryId: 'focaccia',
    name: 'Focaccia Sandwich Vegetables',
    nameIt: null,
    description: 'Artisan focaccia bread filled with grilled seasonal vegetables. Light, fresh, and satisfying.',
    price: 23.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 0,
    imageUrl: '/images/products/focaccia-vegetables.jpg',
    customizations: [],
  },
  {
    id: '22222222-0000-0000-0000-000000000002',
    slug: 'focaccia-spicy-pepperoni',
    categoryId: 'focaccia',
    name: 'Focaccia Sandwich Spicy Pepperoni',
    nameIt: null,
    description: 'Artisan focaccia with Italian pepperoni and a hint of heat. Compact and punchy.',
    price: 26.00,
    isVeg: false,
    isSpicy: true,
    isActive: true,
    position: 1,
    imageUrl: '/images/products/focaccia-spicy-pepperoni.jpg',
    customizations: [],
  },
  {
    id: '22222222-0000-0000-0000-000000000003',
    slug: 'focaccia-bresaola',
    categoryId: 'focaccia',
    name: 'Focaccia Sandwich Bresaola',
    nameIt: null,
    description: 'Air-dried bresaola with rucola on artisan focaccia. Elegant and light.',
    price: 29.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 2,
    imageUrl: '/images/products/focaccia-bresaola.jpg',
    customizations: [],
  },
  {
    id: '22222222-0000-0000-0000-000000000004',
    slug: 'focaccia-veal-ham',
    categoryId: 'focaccia',
    name: 'Focaccia Sandwich Veal Ham',
    nameIt: null,
    description: 'Premium veal ham with fresh condiments on artisan focaccia.',
    price: 34.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 3,
    imageUrl: '/images/products/focaccia-veal-ham.jpg',
    customizations: [],
  },
  {
    id: '22222222-0000-0000-0000-000000000005',
    slug: 'focaccia-prosciutto-rucola',
    categoryId: 'focaccia',
    name: 'Focaccia Sandwich Prosciutto & Rucola',
    nameIt: null,
    description: 'Prosciutto crudo and wild rucola on artisan focaccia. The most premium focaccia on the menu.',
    price: 48.00,
    isVeg: false,
    isSpicy: false,
    isActive: true,
    position: 4,
    imageUrl: '/images/products/focaccia-prosciutto-rucola.jpg',
    customizations: [],
  },
  // Desserts (3 items)
  {
    id: '33333333-0000-0000-0000-000000000001',
    slug: 'nutella-pizza',
    categoryId: 'dessert',
    name: 'Nutella Pizza',
    nameIt: null,
    description: 'The same artisan dough, baked and dressed with Nutella. Simple, indulgent, and the right way to finish.',
    price: 15.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 0,
    imageUrl: '/images/products/nutella-pizza.jpg',
    customizations: [],
  },
  {
    id: '33333333-0000-0000-0000-000000000002',
    slug: 'lotus-biscoff-pizza',
    categoryId: 'dessert',
    name: 'Lotus Biscoff Pizza',
    nameIt: null,
    description: 'Artisan dough base with Lotus Biscoff spread and crushed biscuits. A Gulf-favourite dessert on Neapolitan dough.',
    price: 21.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 1,
    imageUrl: '/images/products/lotus-biscoff-pizza.jpg',
    customizations: [],
  },
  {
    id: '33333333-0000-0000-0000-000000000003',
    slug: 'pistachio-pizza',
    categoryId: 'dessert',
    name: 'Pistachio Pizza',
    nameIt: null,
    description: 'Pistachio cream on artisan dough, topped with crushed pistachios. The premium dessert choice.',
    price: 39.00,
    isVeg: true,
    isSpicy: false,
    isActive: true,
    position: 2,
    imageUrl: '/images/products/pistachio-pizza.jpg',
    customizations: [],
  },
  // Drinks (8 items)
  { id: '44444444-0000-0000-0000-000000000001', slug: 'water', categoryId: 'drinks', name: 'Water', nameIt: null, description: '500ml still water.', price: 3.00, isVeg: true, isSpicy: false, isActive: true, position: 0, imageUrl: '/images/products/water.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000002', slug: 'pepsi', categoryId: 'drinks', name: 'Pepsi', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 1, imageUrl: '/images/products/pepsi.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000003', slug: 'coca-cola', categoryId: 'drinks', name: 'Coca-Cola', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 2, imageUrl: '/images/products/coca-cola.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000004', slug: 'mirinda', categoryId: 'drinks', name: 'Mirinda', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 3, imageUrl: '/images/products/mirinda.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000005', slug: 'mountain-dew', categoryId: 'drinks', name: 'Mountain Dew', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 4, imageUrl: '/images/products/mountain-dew.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000006', slug: '7up', categoryId: 'drinks', name: '7 Up', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 5, imageUrl: '/images/products/7up.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000007', slug: 'sprite', categoryId: 'drinks', name: 'Sprite', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 6, imageUrl: '/images/products/sprite.jpg', customizations: [] },
  { id: '44444444-0000-0000-0000-000000000008', slug: 'fanta', categoryId: 'drinks', name: 'Fanta', nameIt: null, description: '330ml can.', price: 5.00, isVeg: true, isSpicy: false, isActive: true, position: 7, imageUrl: '/images/products/fanta.jpg', customizations: [] },
]

export function getProductBySlug(slug: string): Product | undefined {
  return PRODUCTS.find(p => p.slug === slug && p.isActive)
}

export function getProductsByCategory(categoryId: string): Product[] {
  return PRODUCTS.filter(p => p.categoryId === categoryId && p.isActive)
    .sort((a, b) => a.position - b.position)
}

export function getRelatedProducts(product: Product, count = 3): Product[] {
  const same = PRODUCTS.filter(p => p.categoryId === product.categoryId && p.id !== product.id && p.isActive)
  const others = PRODUCTS.filter(p => p.categoryId !== product.categoryId && p.isActive)
  return [...same, ...others].slice(0, count)
}
```

---

## Image Placeholder Strategy

Real brand photography does not exist yet. During Phase 2, use a consistent placeholder approach:

- Create `public/images/products/` directory.
- For each of the 23 products, the builder adds a single placeholder image (`margherita-classic.jpg` etc.) — either a crop of the existing hero pizza or a solid `--color-bg-subtle` 800x600 JPEG.
- All 23 filenames must exist (even if same file) so `next/image` does not error.
- Product images are swapped to real brand photography in Phase 5.

---

## API Routes / Server Actions

None in Phase 2. "Add to cart" on product detail calls `console.log('add:', item)` and shows a transient "Added" text state. Full cart store wired in Phase 3.

---

## generateStaticParams

```ts
// src/app/menu/[slug]/page.tsx
import { PRODUCTS } from '@/data/mock/catalog'

export function generateStaticParams() {
  return PRODUCTS.filter(p => p.isActive).map(p => ({ slug: p.slug }))
}
```

---

## Auth Requirements

None. All menu routes are public.

---

## Cache Strategy

Phase 2 uses static mock data — no `use cache` needed. When Phase 3 migrates to Supabase:

```ts
// src/app/menu/page.tsx (Phase 3 version)
import { unstable_cacheTag as cacheTag, unstable_cacheLife as cacheLife } from 'next/cache'

async function getCatalog() {
  'use cache'
  cacheTag('catalog')
  cacheLife('hours')
  // supabase query here
}
```

The Phase 2 component structure must be designed to accept data as props from a parent async Server Component — no local data imports inside leaf components — so the Phase 3 migration is a one-file change.

---

## Test Plan

### Manual QA checklist
- [ ] `/menu` renders all 23 products with correct names and prices.
- [ ] Category tab "Pizza" shows exactly 7 items; "Focaccia" 5; "Dessert" 3; "Drinks" 8; "All" 23.
- [ ] Veg dots present on correct 14 items. Spicy dots on correct 3 items.
- [ ] Clicking a product card navigates to `/menu/[slug]`.
- [ ] Product detail page: breadcrumb correct, H1 = product name, price shown, description present.
- [ ] Customization section appears for pizza products, absent for drinks.
- [ ] Selecting "Extra +7.00 AED" on an ingredient reflects in the price calculation (running total shown above "Add to Cart").
- [ ] "Without" selection removes ingredient from visual summary.
- [ ] Quantity stepper: cannot go below 1 or above 20.
- [ ] "ADD TO CART" click shows "Added" confirmation text for 2 seconds, then resets.
- [ ] Related products strip shows 3 items, none identical to current product.
- [ ] `/menu/nonexistent-slug` returns custom 404 (not-found.tsx).
- [ ] `next build` shows 23 static product pages in output.
- [ ] Mobile 390px: product detail stacked correctly, add button full-width.
- [ ] No emoji. No gradients. All H1/H2 UPPERCASE. Sharp corners on all non-image elements.
- [ ] `npx tsc --noEmit` exits 0.
- [ ] `npx eslint src/` exits 0.

---

## Performance Budget

| Metric | Target |
|--------|--------|
| LCP (`/menu`) | < 2.0s (images are placeholders, small) |
| LCP (`/menu/[slug]`) | < 1.8s |
| CLS | < 0.05 |
| Product card image | < 40KB per image (placeholder) |
| JS bundle delta vs Phase 1 | < 25KB gzipped (Zustand not yet loaded) |

---

## Accessibility Checklist

- [ ] `<ProductCard>` image: `alt="[Product name] pizza"` or appropriate.
- [ ] Veg dot: `<span aria-label="Vegetarian" role="img">` — 8px circle, no visible text.
- [ ] Spicy dot: `<span aria-label="Contains chilli" role="img">`.
- [ ] Category tabs: `role="tablist"`, each tab `role="tab"`, active tab `aria-selected="true"`.
- [ ] Radio groups: each `<RadioGroup>` has `aria-labelledby` pointing to ingredient name.
- [ ] Quantity stepper: `-` button `aria-label="Decrease quantity"`, `+` button `aria-label="Increase quantity"`. Current count has `aria-live="polite"`.
- [ ] Breadcrumb: `<nav aria-label="Breadcrumb">` with `<ol>` and `aria-current="page"` on last item.

---

## Definition of Done

- [ ] All 23 products browsable on `/menu` with category filter.
- [ ] All 23 product detail pages render at `/menu/[slug]`.
- [ ] `next build` exits 0, 23 static pages confirmed.
- [ ] Owner has reviewed product card design and detail page and confirmed approval.
- [ ] All QA checklist items checked.
- [ ] No DESIGN.md bans violated.

---

## Out of Scope / Deferred

- Cart writes — Phase 3.
- Supabase catalog reads — Phase 3.
- Product reviews — no data, deferred.
- Allergen / nutrition info — content not available.
- Search — Phase 5.
- Category page hero images — Phase 5 (brand shoot).
