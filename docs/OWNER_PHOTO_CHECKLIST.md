# Owner Photo Swap Checklist

The images currently shipped under `public/images/` are **locally generated,
fully-owned brand placeholders** (no external/copyrighted downloads). They are
distinct per item and optimized for launch, but they are illustrative — replace
them with real photography before or shortly after launch.

> Regenerate placeholders any time with: `node scripts/generate-brand-images.mjs`

## How to swap (keep paths identical — the app references these exact paths)

Drop the real photo in at the **same path and filename**. No code changes are
needed; the catalog (`src/data/mock/catalog.ts`) and components already point at
these paths.

### Recommended specs
| Asset group | Path | Dimensions | Aspect | Target size |
|---|---|---|---|---|
| Product photos | `public/images/products/<slug>.jpg` | 800×600 (min) | 4:3 | ≤ 60 KB |
| Hero | `public/images/hero-pizza.jpg` | 1600×1000+ | 16:10 | ≤ 120 KB |
| Editorial | `public/images/article-welcome.jpg`, `article-lievito.jpg`, `article-seven.jpg` | 1000×750 | 4:3 | ≤ 80 KB |
| Location | `public/images/location-block.jpg` | 1000×1000 | 1:1 | ≤ 80 KB |

- Shoot/crop to **4:3** for products (cards render `aspect-[4/3]`, `object-cover`).
- Hero renders full-bleed `object-cover`; keep the subject centered.
- Location renders square on desktop (`md:aspect-square`); keep the storefront centered.
- Export progressive JPEG, quality ~78, 4:2:0 chroma. Quick optimize:
  `npx sharp-cli` or re-run the generator's `render()` settings as a reference.

### Product slugs to cover (23)
**Pizza:** margherita-classic, vegetable-ortolana, merguez, diavola-piccante,
quattro-stagioni, bresaola-truffle, prosciutto-rucola
**Focaccia:** focaccia-vegetables, focaccia-spicy-pepperoni, focaccia-bresaola,
focaccia-veal-ham, focaccia-prosciutto-rucola
**Dessert:** nutella-pizza, lotus-biscoff-pizza, pistachio-pizza
**Drinks:** water, pepsi, coca-cola, mirinda, mountain-dew, 7up, sprite, fanta

> Drinks: use your own product shots. Do not download brand/marketing imagery —
> the current placeholders are abstract colored cans precisely to avoid trademark
> assets.

## After swapping
- [ ] Confirm every `public/images/products/<slug>.jpg` is a real photo
- [ ] Confirm hero, 3 article, and location images are real
- [ ] Re-run `npm run build` and spot-check `/`, `/menu`, a `/menu/[slug]`
- [ ] Re-check Lighthouse on `/` and `/menu` (image weight changes the score)
- [ ] Update `alt` text in components if a photo's content differs meaningfully
      from the current descriptive alt
