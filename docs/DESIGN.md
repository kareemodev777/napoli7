# Napoli 7 — Design System

**Reference**: webshop.dieci.ch (Swiss-Italian pizzeria webshop)
**Brand mark**: `assets/logo-final.png` — azzurro Napoli (deep navy + sky azure) with small Italian-flag accents.
**Direction**: Dieci's Swiss architectural discipline (sharp rectangular grids, Helvetica/Univers-family sans, UPPERCASE letter-spaced headings, white canvas, photography-led blocks, no gradients, no rounded pills) executed in the brand's own **navy + azure** palette. The structure is a near-twin of Dieci. The accent color is Napoli, not Dieci.

This is the source of truth for all UI work on Napoli 7. Do not deviate without an ADR.

---

## 1. Brand DNA

| Axis | Dieci | Napoli 7 |
|------|-------|----------|
| Origin | Swiss-Italian | Italian-Emirati (Ajman) |
| Personality | Precise, restrained, professional | Same |
| Voice | Confident, terse, food-first | Same — bilingual EN+AR ready |
| Mood | White canvas, red accent, photography hero | White canvas, **navy accent + azure highlight**, photography hero |
| Furniture | Sharp rectangles, 0px radius, hairline borders | Same |
| Wrong moves | Gradients, soft shadows, emoji icons, pastel cards, bouncy motion, hero videos with parallax | Same — banned (see §10) |

The objective: a customer landing on napoli7.com should feel the same Swiss precision Dieci projects, but with copy and imagery rooted in Naples. Discipline first; flair via photography and ingredient sourcing language.

---

## 2. Color System

White canvas + brand navy + brand azure + ink black + grayscale ramp. Italian flag red + green appear *only* as tiny accent details, never as functional UI. No gradients anywhere.

### Tokens

```
/* Brand — sampled from logo, tuned for AA/AAA contrast on white */
--color-brand:           #1E3A8A;  /* Deep navy — primary CTAs, links, headlines accent. AAA on white (9.1:1) */
--color-brand-azure:     #34A5DC;  /* Sky azure (logo inner disc) — secondary accent, hover highlight, illustrative fills */
--color-brand-azure-deep:#1E88C7;  /* Azure pressed/hover */
--color-brand-deep:      #142A66;  /* Deeper navy — header pill, primary CTA hover */
--color-brand-hover:     #16307A;  /* Primary CTA hover */
--color-brand-soft:      #E8EFFB;  /* Navy tint — info banners, soft badges */
--color-brand-azure-soft:#E1F2FB;  /* Azure tint — promotional / accent backgrounds */

/* Italian flag — tertiary accents only (footer flag bar, "spicy" indicator dot, etc.) */
--color-flag-green:      #009038;
--color-flag-red:        #E00008;
--color-flag-white:      #FFFFFF;

/* Ink */
--color-ink:             #0A0A0A;  /* Display headings */
--color-ink-strong:      #1A1A1A;  /* H2-H4 */
--color-ink-body:        #585858;  /* Body copy */
--color-ink-muted:       #8A8A8A;  /* Captions, helper text */

/* Surface */
--color-bg:              #FFFFFF;  /* Page background */
--color-bg-subtle:       #F8F8F8;  /* Secondary section bg */
--color-bg-azure-tile:   #E1F2FB;  /* Optional: azure-tinted feature tiles to echo logo inner disc */
--color-bg-overlay:      rgba(0,0,0,0.45);  /* Modal scrim */

/* Borders */
--color-border:          #E6E6E6;  /* Card hairline */
--color-border-strong:   #D9D9D9;  /* Input idle, divider */
--color-border-ink:      #0A0A0A;  /* Outlined button border */

/* State */
--color-success:         #398F14;
--color-success-soft:    #D3E991;
--color-error:           #D11C1C;
--color-error-soft:      #FCE2E2;
--color-info:            #1E3A8A;  /* Reuses brand navy — cookie / system banners */

/* Functional */
--color-row-hover:       #EFEFEF;
--color-disabled-bg:     #F0F0F0;
--color-disabled-text:   #A6A6A6;
```

### Application rules

- **Primary CTA**: solid `--color-brand` (navy) background, white text, sharp corners. Hover → `--color-brand-hover`.
- **Secondary CTA**: 2px solid `--color-border-ink`, white bg, ink text. Hover → ink bg + white text invert.
- **Tertiary / link**: `--color-brand` text, underline on hover only.
- **Destructive**: solid `--color-error`, white text.
- **Section dividers**: 1px `--color-border` only — never colored, never thicker.
- **Brand navy usage budget**: ≤ 15% of any viewport. It is an accent, not a wash.
- **Azure usage**: as a *fill* color for one feature tile per page max (echoing the logo's inner disc), as button hover transitions, as link hover, as badge tint background. Never as the dominant CTA — that's navy.
- **Italian flag red + green**: reserved for one of three places only:
  1. A 3-bar flag micro-strip (green / white / red) in the footer or a hero corner.
  2. A "spicy" red indicator dot on Diavola Piccante and Merguez product cards.
  3. A "vegetarian" green dot on Ortolana, Vegetable focaccia, and Margherita.
- **Forbidden combinations**: navy text on azure bg (low contrast), red text on navy, gradient mixes of brand + ink, more than one accent color in a single component.

---

## 3. Typography

Dieci uses a custom "Font Primary" descended from Univers/Helvetica. Napoli 7's free, self-hostable equivalent stack:

```
/* Display + UI: Helvetica/Univers-family geometric sans */
--font-display: "Neue Haas Grotesk", "Helvetica Now Display",
                "Helvetica Neue", "Inter", system-ui, sans-serif;

/* Body */
--font-body:    "Neue Haas Grotesk Text", "Helvetica Now Text",
                "Helvetica Neue", "Inter", system-ui, sans-serif;

/* Numerics for prices (tabular) */
--font-numeric: "Neue Haas Grotesk Text", "Helvetica Now Text",
                ui-monospace, "SF Mono", Menlo, monospace;
font-feature-settings: "tnum" 1, "lnum" 1;
```

If Neue Haas Grotesk is out of budget: fallback chain is **Inter** (free) tuned with `font-feature-settings: "ss01", "cv11"` to suppress the double-storey *a* and align it with Helvetica's calmer feel. Inter at weight 400/500/700 reads close enough.

Arabic pairing (when AR locale is added): **Tajawal** or **IBM Plex Sans Arabic** — match weights 400/700.

### Scale

Mobile values in parentheses where they differ.

| Token | Size | Line | Weight | Letter-spacing | Usage |
|------|-----:|-----:|------:|---------------:|------|
| `--text-display` | 56px (40px) | 1.05 | 700 | -0.01em | Hero H1 |
| `--text-h1` | 34px (28px) | 1.15 | 700 | **+1.5px** | Page H1 |
| `--text-h2` | 26px (22px) | 1.2 | 700 | **+1.5px** | Section H2 |
| `--text-h3` | 18px | 1.3 | 700 | +1px | Card / panel title |
| `--text-h4` | 16px | 1.4 | 700 | +0.5px | Sub-section |
| `--text-eyebrow` | 12px | 1.4 | 700 | +1.5px, UPPERCASE | Section eyebrow above H2 |
| `--text-body-lg` | 16px | 1.6 | 400 | 0 | Long-form intro |
| `--text-body` | 14px | 1.5 | 400 | 0 | Default body |
| `--text-body-sm` | 13px | 1.5 | 400 | 0 | Helper, FAQ answer |
| `--text-caption` | 12px | 1.4 | 400 | +0.2px | Captions, meta |
| `--text-price-lg` | 22px | 1 | 700 | 0, tabular | Cart line price |
| `--text-price` | 16px | 1 | 700 | 0, tabular | Card price |
| `--text-button` | 13px | 1 | 700 | +1.5px, UPPERCASE | All buttons |

### Heading rules (Dieci signature)

- All `H1` and `H2` ship in **uppercase** with **letter-spacing 1.5px**. This is the Dieci flourish — non-negotiable.
- `H3+` stays sentence case to avoid screaming.
- Headings are `--color-ink` (`#0A0A0A`), never navy. Brand navy lives on accents and CTAs. (Exception: a single hero word can render in `--color-brand` to anchor the page — use sparingly, max one per page.)
- Italic reserved for product names with foreign-language origin (*Margherita*, *Quattro Stagioni*, *lievito madre*) — adds subtle Italian warmth without breaking discipline.

### Body rules

- 14px default. 16px only for hero subhead and long-form intro paragraphs.
- Maximum line length: **65ch**. Prefer 55ch on body copy.
- Color: `--color-ink-body`. Never use brand navy or azure for prose.

---

## 4. Spacing & Grid

Dieci runs a tight 1110px container with 30px gutters. We mirror it but go responsive-first since 65%+ of orders will be mobile.

### Spacing scale (4px base)

```
--space-0:  0;
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
--space-32: 128px;  /* hero block padding */
```

### Layout

```
--container-max: 1140px;     /* Dieci-equivalent */
--container-pad: 16px;       /* mobile */
--container-pad-md: 24px;    /* >=768px */
--container-pad-lg: 32px;    /* >=1140px */
--gutter: 24px;
```

### Breakpoints

```
--bp-sm:  480px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1140px;   /* Dieci threshold */
--bp-2xl: 1400px;
```

### Section padding

- Hero: `padding-block: var(--space-20)` (mobile `var(--space-12)`)
- Content sections: `padding-block: var(--space-16)`
- Card padding: `var(--space-6)` (24px)

---

## 5. Radii, Borders, Shadows, Motion

### Radii (Dieci uses 0px almost everywhere)

```
--radius-0:    0;          /* default — buttons, inputs, cards */
--radius-sm:   2px;        /* badges, chips */
--radius-md:   4px;        /* product image masks, modal */
--radius-pill: 999px;      /* RESERVED — only for status dots, never buttons */
```

Default is **0**. Use sparingly — sharp corners are the look.

### Borders

- Hairline: `1px solid var(--color-border)`.
- Outlined button: `2px solid var(--color-border-ink)`.
- Input idle: `1px solid var(--color-border-strong)`.
- Input focus: `2px solid var(--color-brand)` (navy), no glow shadow.

### Shadows

Used very sparingly. White canvas does the work.

```
--shadow-sm:    0 1px 2px rgba(0,0,0,0.06);                /* card hover only */
--shadow-md:    0 0 0 1px var(--color-border), 0 4px 12px rgba(0,0,0,0.06);
--shadow-banner: 0 0 5px 5px rgba(0,0,0,0.10);             /* sticky header */
--shadow-modal: 0 20px 40px rgba(0,0,0,0.20);
```

No colored shadows. No glow. No drop shadows on text.

### Motion

```
--ease-standard: cubic-bezier(0.2, 0, 0, 1);
--ease-emphasized: cubic-bezier(0.2, 0, 0, 1);  /* same — we don't bounce */
--dur-fast:   120ms;
--dur-base:   200ms;
--dur-slow:   320ms;
```

- Default transition: `all var(--dur-base) var(--ease-standard)`.
- **No spring physics, no bounce, no overshoot.** Linear or near-linear easings only.
- Hover scale on imagery: max `scale(1.02)` over 320ms.
- Page transitions: simple opacity fade ≤200ms. No slide-ins.
- Loading: minimal text "Loading..." or thin determinate bar. No skeleton shimmer party.
- Respect `prefers-reduced-motion` — disable all transforms.

---

## 6. Components

### Buttons

| Variant | Bg | Border | Text | Padding | Notes |
|--------|----|--------|------|---------|-------|
| Primary | `--color-brand` (navy) | none | `#fff` | `12px 24px` | Default order CTA |
| Primary hover | `--color-brand-hover` | none | `#fff` | — | No transform |
| Secondary | `#fff` | `2px solid #0A0A0A` | `#0A0A0A` | `10px 22px` | "View menu" etc |
| Secondary hover | `#0A0A0A` | `2px solid #0A0A0A` | `#fff` | — | invert |
| Tertiary | transparent | none | `--color-brand` | `8px 0` | underline on hover |
| Accent | `--color-brand-azure` | none | `#fff` | `12px 24px` | Promo / "Apply voucher" — supporting CTA only, not order CTA |
| Destructive | `--color-error` | none | `#fff` | `12px 24px` | "Cancel order" |

All buttons: 0px radius, 13px UPPERCASE label, letter-spacing 1.5px, weight 700. Min height 44px (touch target). Disabled: bg `#F0F0F0`, text `#A6A6A6`, no border.

### Forms

- Input: 1px border `#D9D9D9`, height 44px, 14px text, 12px horizontal padding, 0px radius.
- Focus: 2px border `--color-brand`, no shadow halo.
- Error: 2px border `--color-error`, helper text `--color-error` 12px below.
- Label: 12px UPPERCASE, weight 700, letter-spacing 1px, color `--color-ink-strong`, sits above input with 6px gap.
- Required marker: red asterisk after label.

### Cards (product card, store card)

- Background `#fff`, border `1px solid var(--color-border)`, radius `--radius-md` (4px) — *one* concession for product imagery; everything else stays sharp.
- Image: 4:3 ratio, full-bleed at top.
- Padding: `--space-6`.
- Title: `--text-h3`, color `--color-ink-strong`.
- Description: `--text-body-sm`, 2 lines max, ellipsis.
- Price: `--text-price`, ink color, tabular.
- CTA: full-width primary button at bottom.
- Hover: shadow `--shadow-sm`, border stays. No lift transform.

### Header (banner, Dieci-cloned)

- Sticky, height 80px (mobile 64px), white bg, `--shadow-banner` along bottom.
- Logo flush-left, max-width 220px (the actual `logo-final.png` mark — circular, navy + azure).
- Nav center or right: 14px UPPERCASE, letter-spacing 1.5px, weight 700, color `--color-ink-strong`. Active: `--color-brand` (navy) with 2px navy underline 4px below text.
- Right-edge "Login" pill in `--color-brand-deep` (`#142A66`) with white text, 12px, 27px tall — direct lift from Dieci's login chip, recolored to brand navy.
- Cart icon: ink line icon + bubble counter in `--color-brand` (navy).

### Footer

- Background `--color-brand-deep` (`#142A66`) — deeper navy than the brand primary, anchors the page like Dieci's ink black footer but in our brand palette.
- 4 columns on desktop: brand block / Quick links / Support / Contact + social.
- Heading: 12px UPPERCASE letter-spacing 1.5px, color white.
- Links: 13px regular, color `rgba(255,255,255,0.75)`, hover white.
- Social icons: 20px line icons, white at 0.75 opacity.
- **Italian flag micro-strip**: 3 vertical bars (green `#009038` / white / red `#E00008`), each 4px wide × 24px tall, sitting above the copyright row. The single permitted use of green and red as accent.
- Bottom strip: copyright + legal links, 12px, opacity 0.6.

### Modal

- Width 480px (form) / 760px (product detail) / 1180px (basket).
- Bg `#fff`, radius `--radius-md`, shadow `--shadow-modal`.
- Header: 18px H3 weight 700, ink, with close X icon top-right.
- Scrim: `rgba(0,0,0,0.45)`.

### Badges

- Pill style, 0px radius (Dieci-faithful) — small `--radius-sm` only if it sits inside imagery.
- Discount badge: `--color-brand` (navy) bg, white text, 11px UPPERCASE.
- "New" badge: ink bg, white text.
- "Bestseller" badge: `--color-brand-azure` bg, white text.
- **Veg dot**: 8px circle, `--color-flag-green`, no label — placed top-right of product image.
- **Spicy dot**: 8px circle, `--color-flag-red`, no label — placed top-right of product image (Diavola, Merguez).
- These two flag-colored dots are the only badge-context use of green and red.

---

## 7. Iconography

**Banned**: emoji, color emoji, decorative emoji-as-icon. Anywhere.

**Use**: a line icon set, monoline, 1.5px stroke, 24x24 grid.

Recommended: **Lucide** (free, MIT). Fallbacks: Phosphor, Heroicons (outline only). Pick one set, stay in it.

Icon color: inherits text color. For "What Makes Us Special" tile icons, render at 32–40px in `--color-brand` (navy) against a white or `--color-bg-azure-tile` background. Pick one approach for the row and stick with it — don't mix backgrounds.

Custom-illustrated mark for the four feature tiles (wood-fired oven, leaf, clock, sparkle) is fine, as long as they share a common stroke weight, monoline style, and ink/navy palette.

---

## 8. Imagery

Dieci's strongest asset is photography. Match the discipline.

### Pizza shots
- **Top-down or 30° angle** on the pie itself.
- Backgrounds: dark wood, raw stone, or matte ink black (no tablecloths, no props clutter).
- Light: directional, warm 3000K key, no ring-light flatness.
- Tight crop — pizza fills 80%+ of frame; no whitespace plate halos.
- No filters that crush blacks or boost saturation.

### Lifestyle shots
- Hands stretching dough, oven flames, the pizzaiolo's eyes — close, candid, never staged grins to camera.
- Black-and-white acceptable for one hero block per page; everything else color.

### Treatment
- Square (1:1) or 4:3 ratio for product cards.
- 16:9 or 21:9 for hero banners.
- Rounded corners only at `--radius-md` (4px) and only on imagery — never on layout containers.

### File pipeline
- Source: ≥3000px, AdobeRGB ok at upload, sRGB at delivery.
- Web: AVIF primary, WebP fallback, JPG legacy. `<img loading="lazy" decoding="async">`.
- Hero LCP image: preload as `<link rel="preload">` with `fetchpriority="high"`.

---

## 9. Voice & Copy

- **Tone**: precise, terse, ingredient-led. Sentences earn their length.
- **Sentence case** in body and most UI. **UPPERCASE** only where the type system says so (eyebrows, H1-H2, buttons, badges, labels).
- **Never**: exclamation marks ("!"). Never. The food doesn't shout; the type system does the lifting.
- **Foreign words**: italicize first appearance only. *Lievito madre* on first mention, *lievito madre* (no italic) thereafter.
- **Numbers**: digits, never spelled out. "30 minutes", not "thirty minutes". UAE numerals (Western Arabic).
- **Prices**: `29.00 AED` with tabular figures, AED suffix (Dieci uses prefix CHF; we follow Ajman convention with suffix).
- **Microcopy patterns**:
  - Primary CTA verbs: *Order*, *Add*, *Track*, *Continue*. Avoid *Submit*, *Click here*, *Learn more*.
  - Empty states: 1 line statement + 1 line action. e.g. *No orders yet. Order your first pizza.*
  - Error messages: state what happened + what to do. Never just "Error."

### Tagline (current site)
> *Authentic wood-fired pizzas crafted with passion, premium ingredients, and delivered hot to your doorstep.*

Recommended tightening:
> *Authentic Neapolitan pizza. Caputo flour, San Marzano DOP, lievito madre. Delivered in 30 minutes.*

---

## 10. Bans (Zero Tolerance)

These will not ship. No exceptions.

1. **Emojis** in any UI surface — page, header, button, card, badge, error, footer.
2. **Gradients** of any kind — no brand-red-to-deep-red, no soft fades on hero. Solid blocks only.
3. **Decorative drop shadows** on text or icons.
4. **Glow effects** (text-shadow, box-shadow with spread + alpha tint).
5. **Soft pastel cards** (washed pink, washed cream). The canvas is white.
6. **Bouncy / elastic / spring easings.** No `back-out`, no overshoots.
7. **Auto-rotating carousels** with no user control.
8. **Hero parallax** that decouples from natural scroll.
9. **Side-stripe colored borders** on cards (left/top accent strip). AI-slop pattern.
10. **All-centered everything.** Break symmetry — left-align body, right-align price.
11. **Default system fonts** without the Inter/Helvetica fallback chain.
12. **Stock photography** of pizzas not made in our oven. Real product, real kitchen, only.
13. **Cookie banner cuteness** ("We use cookies " with smiley). Plain functional only.
14. **More than 2 brand colors**. Navy is primary, azure is secondary support. Italian flag green/red appear only in the three sanctioned places (footer micro-strip, veg dot, spicy dot). No fourth accent.

---

## 11. Accessibility

- Contrast: body 14px must hit AA (4.5:1) — `--color-ink-body #585858` on white = 6.4:1, pass.
- Brand navy `#1E3A8A` on white = **9.1:1**, AAA for normal text.
- Brand azure `#34A5DC` on white = 3.0:1 — fails AA for body text. Azure is for **fills, hover states, and large display only**, never for small text on white.
- Italian flag red `#E00008` on white = 5.5:1, AA for normal text — but use is restricted to the spicy dot (8px circle, no text), so contrast is not consumed for legibility.
- Focus state: 2px ring `--color-brand`, 2px offset, on every interactive element. Never `outline: none` without replacement.
- Touch targets: 44x44px minimum.
- Heading order: H1 → H2 → H3, no skipping.
- Form labels: always present (visible label preferred; aria-label only when visual would clutter).
- Image alt text: required, descriptive. Pizza names alone — `alt="Margherita Classic pizza"`, not `alt="pizza1.jpg"`.
- Reduced motion: disable all transforms when `prefers-reduced-motion: reduce`.
- Keyboard: full nav reachable by tab, no traps. Skip-to-content link at top.

---

## 12. Localization Readiness

Even if v1 ships English-only, build now for AR (Ajman audience).

- All copy in `i18n/{en,ar}.json`. No hardcoded strings.
- Layout uses logical properties: `padding-inline`, `margin-inline-start`, `border-inline-end`. No `padding-left/right`.
- `dir="rtl"` swaps automatically when locale is `ar`.
- Numerals: Western Arabic (1, 2, 3) by default; allow user toggle to Eastern Arabic (١، ٢، ٣) once.
- Currency string: `29.00 AED` (EN), `29.00 د.إ` (AR).
- Font swap: Helvetica family for EN, **Tajawal** or **IBM Plex Sans Arabic** for AR.

---

## 13. Page-Level Layout Recipes

### Home

1. Sticky header (white, 80px).
2. **Hero** — full-bleed photo of margherita, 80vh on desktop. Headline overlay left-bottom: H1 UPPERCASE white, sub-line in body-lg, two CTAs (primary navy + secondary outline white).
3. **Eyebrow + 4-tile feature row** — "What Makes Us Special". Tiles 1:1 aspect, white bg, ink line icon top, H3 + 2-line caption.
4. **Menu strip by category** — 4 cards (Pizza/Focaccia/Dessert/Drinks) each with category photo + count + arrow. Click → category page.
5. **Featured pizzas** — horizontal scroll on mobile, 4-up grid on desktop. Product cards.
6. **About teaser** — 2-column: photo left, ink black background panel right with quote + outline CTA "Our Story".
7. **Location block** — full-width map on right, address/hours/phone on left. Single store anchor.
8. Footer (ink black).

### Menu / Category

- Header.
- Page H1 (UPPERCASE letter-spacing 1.5px) + 1-line category description + thin divider.
- Filter chips (sticky, optional): All / Vegetarian / Spicy / Premium.
- Grid: 3 columns desktop / 2 tablet / 1 mobile. Product cards.
- Footer.

### Product Detail

- Header.
- 2-column desktop: image left (4:3, fills column), info right.
- Right column: category eyebrow → H1 product name → price → 2-paragraph story → ingredients list (chips, 0px radius) → customization (radio groups: Default / Extra +X / Without) → quantity stepper → add-to-cart primary button (full-width on mobile).
- Below the fold: "Pairs with" carousel (related products).
- Footer.

### Cart / Checkout

- Single-column on mobile, 2/3 + 1/3 on desktop (line items + sticky summary).
- Order summary: tabular figures, hairline rules between rows.
- Promo input: ghost button "Apply".
- Primary checkout button at bottom of summary.

---

## 14. Component / Token Glossary

Use these CSS variable names verbatim. Do not invent synonyms.

```
Color:    --color-{role}[-{state}]
Spacing:  --space-{n}        (1,2,3,4,5,6,8,10,12,16,20,24,32)
Radius:   --radius-{0,sm,md,pill}
Font:     --font-{display,body,numeric}
Text:     --text-{token}      (display, h1...h4, eyebrow, body-lg, body, body-sm, caption, price-lg, price, button)
Shadow:   --shadow-{sm,md,banner,modal}
Easing:   --ease-{standard,emphasized}
Duration: --dur-{fast,base,slow}
Container:--container-{max,pad,pad-md,pad-lg}
Breakpoint:--bp-{sm,md,lg,xl,2xl}
```

---

## 15. Out of Scope (Later)

- Dark mode. Dieci doesn't ship one and neither do we — yet.
- Multi-store directory page (single Al Jurf store currently).
- Loyalty / points UI (Dieci has one; defer until business case).
- Admin / kitchen display UI (separate system).

---

## Approvals

This document is the locked design source of truth for Napoli 7 v1. Any change requires:
1. Note in `docs/decisions/` as an ADR.
2. Update of the relevant section above.
3. Sign-off from project owner.
