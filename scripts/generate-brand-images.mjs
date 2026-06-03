// Napoli 7 — launch placeholder image generator.
//
// Generates distinct, brand-themed, optimized "photographic-style" JPEGs for
// every asset the app consumes, at the EXACT paths it expects. These are
// owner-photo stand-ins: locally generated, fully owned, no external downloads.
// Swap them for real food photography before/at launch — see
// docs/OWNER_PHOTO_CHECKLIST.md.
//
// Run: node scripts/generate-brand-images.mjs
//
// Deterministic: theming is seeded from each slug, so re-running produces the
// same assets (no Math.random).

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const IMG = path.join(ROOT, "public", "images");
const PROD = path.join(IMG, "products");

// ---- deterministic seed helpers --------------------------------------------
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---- palette (echoes globals.css brand tokens, sRGB approximations) ---------
const C = {
  crustLight: "#e7b572",
  crustDeep: "#c2843a",
  char: "#5a3a1f",
  sauce: "#b8341f",
  sauceDeep: "#8c2417",
  cheese: "#f4e7c4",
  cheeseHi: "#fbf3da",
  basil: "#3c7a3a",
  rucola: "#5a8a39",
  board: "#8a5a32",
  boardDeep: "#6a4426",
  slate: "#2b2622",
  linen: "#efe7d8",
  azure: "#5aa6d6",
  brand: "#2f2a7a",
};

// ---- low-level svg pieces ---------------------------------------------------
function filters() {
  return `
    <defs>
      <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="soft2" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
      <radialGradient id="vign" cx="50%" cy="42%" r="75%">
        <stop offset="55%" stop-color="#000" stop-opacity="0" />
        <stop offset="100%" stop-color="#000" stop-opacity="0.34" />
      </radialGradient>
      <radialGradient id="spot" cx="38%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.18" />
        <stop offset="60%" stop-color="#fff" stop-opacity="0" />
      </radialGradient>
    </defs>`;
}
function vignette(w, h) {
  return `<rect width="${w}" height="${h}" fill="url(#spot)"/><rect width="${w}" height="${h}" fill="url(#vign)"/>`;
}
function boardBg(w, h, seed) {
  const r = rng(seed);
  let planks = "";
  const n = 7;
  for (let i = 0; i < n; i++) {
    const y = (h / n) * i;
    const shade = i % 2 === 0 ? C.board : C.boardDeep;
    planks += `<rect x="-10" y="${y}" width="${w + 20}" height="${h / n + 2}" fill="${shade}"/>`;
    planks += `<rect x="-10" y="${y - 1}" width="${w + 20}" height="2" fill="#000" opacity="0.12"/>`;
    // grain streaks
    for (let g = 0; g < 5; g++) {
      const gy = y + r() * (h / n);
      planks += `<rect x="-10" y="${gy}" width="${w + 20}" height="1.2" fill="#000" opacity="${0.04 + r() * 0.05}"/>`;
    }
  }
  return planks;
}
// pizza disc with sauce + cheese + char, themed toppings drawn by caller
function pizzaBase(cx, cy, rad, seed) {
  const r = rng(seed);
  let char = "";
  for (let i = 0; i < 22; i++) {
    const a = r() * Math.PI * 2;
    const rr = rad * (0.9 + r() * 0.12);
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    char += `<circle cx="${x}" cy="${y}" r="${2 + r() * 5}" fill="${C.char}" opacity="${0.35 + r() * 0.4}"/>`;
  }
  // cheese blotches
  let cheese = "";
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const rr = r() * rad * 0.74;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const s = 8 + r() * 16;
    cheese += `<ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.8}" fill="${C.cheese}" opacity="0.9"/>`;
    cheese += `<ellipse cx="${x - s * 0.2}" cy="${y - s * 0.2}" rx="${s * 0.4}" ry="${s * 0.3}" fill="${C.cheeseHi}" opacity="0.7"/>`;
  }
  return `
    <ellipse cx="${cx}" cy="${cy + rad * 0.08}" rx="${rad * 1.04}" ry="${rad * 0.98}" fill="#000" opacity="0.28" filter="url(#soft)"/>
    <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.crustLight}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${C.crustDeep}" stroke-width="${rad * 0.05}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad * 0.82}" fill="${C.sauce}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad * 0.82}" fill="url(#spot)"/>
    ${cheese}
    ${char}`;
}
function dots(cx, cy, rad, seed, count, color, sz, extra = "") {
  const r = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const rr = r() * rad * 0.72;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    const s = sz * (0.75 + r() * 0.5);
    out += `<circle cx="${x}" cy="${y}" r="${s}" fill="${color}"/>`;
    if (extra) out += extra.replaceAll("{x}", x).replaceAll("{y}", y).replaceAll("{s}", s);
  }
  return out;
}

// ---- product builders -------------------------------------------------------
function pizzaSvg(slug, w, h) {
  const seed = hash(slug);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.38;
  const t = {
    "margherita-classic": () =>
      dots(cx, cy, rad, seed, 9, C.basil, 9) +
      dots(cx, cy, rad, seed + 5, 7, C.cheeseHi, 16),
    "vegetable-ortolana": () =>
      dots(cx, cy, rad, seed, 6, "#3f8a3a", 11) +
      dots(cx, cy, rad, seed + 1, 6, "#e0a52a", 10) +
      dots(cx, cy, rad, seed + 2, 6, "#c23a2a", 10) +
      dots(cx, cy, rad, seed + 3, 5, "#2e2a26", 7),
    merguez: () =>
      dots(cx, cy, rad, seed, 12, "#7a2f23", 12, `<circle cx="{x}" cy="{y}" r="{s}" fill="none" stroke="#4a1d16" stroke-width="2"/>`),
    "diavola-piccante": () =>
      dots(cx, cy, rad, seed, 11, "#b13024", 15, `<circle cx="{x}" cy="{y}" r="{s}" fill="none" stroke="#7d1d16" stroke-width="2.5"/>`),
    "quattro-stagioni": () => {
      // four quadrants
      const q = (ang, color, n, s) => {
        const r = rng(seed + Math.round(ang));
        let o = "";
        for (let i = 0; i < n; i++) {
          const a = ang + (r() - 0.5) * 1.3;
          const rr = rad * (0.25 + r() * 0.45);
          o += `<circle cx="${cx + Math.cos(a) * rr}" cy="${cy + Math.sin(a) * rr}" r="${s}" fill="${color}"/>`;
        }
        return o;
      };
      return q(-2.4, "#2e2a26", 5, 7) + q(-0.7, "#b13024", 4, 12) + q(0.9, "#3f8a3a", 5, 8) + q(2.4, "#8a5a32", 5, 10);
    },
    "bresaola-truffle": () =>
      dots(cx, cy, rad, seed, 7, "#9c3540", 18, `<ellipse cx="{x}" cy="{y}" rx="{s}" ry="${rad * 0.04}" fill="#7a2630" opacity="0.5"/>`) +
      dots(cx, cy, rad, seed + 4, 6, C.rucola, 8) +
      dots(cx, cy, rad, seed + 6, 5, "#2b2622", 4),
    "prosciutto-rucola": () =>
      dots(cx, cy, rad, seed, 6, "#d98a8e", 17) +
      dots(cx, cy, rad, seed + 2, 9, C.rucola, 9),
  };
  const toppings = (t[slug] ?? t["margherita-classic"])();
  return svgDoc(
    w,
    h,
    `${boardBg(w, h, seed)}${pizzaBase(cx, cy, rad, seed)}${toppings}<circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#spot)"/>`,
  );
}

function focacciaSvg(slug, w, h) {
  const seed = hash(slug);
  const cx = w / 2;
  const cy = h / 2;
  const bw = w * 0.62;
  const bh = h * 0.34;
  const fill =
    {
      "focaccia-vegetables": "#4f8a39",
      "focaccia-spicy-pepperoni": "#b13024",
      "focaccia-bresaola": "#9c3540",
      "focaccia-veal-ham": "#caa07a",
      "focaccia-prosciutto-rucola": "#d98a8e",
    }[slug] ?? "#caa07a";
  const r = rng(seed);
  let crumbs = "";
  for (let i = 0; i < 30; i++) {
    crumbs += `<circle cx="${cx - bw / 2 + r() * bw}" cy="${cy - bh / 2 + r() * bh * 0.5}" r="${1 + r() * 2.5}" fill="#fff" opacity="${0.15 + r() * 0.3}"/>`;
  }
  const body = `
    ${boardBg(w, h, seed)}
    <ellipse cx="${cx}" cy="${cy + bh * 0.7}" rx="${bw * 0.62}" ry="${bh * 0.4}" fill="#000" opacity="0.30" filter="url(#soft)"/>
    <!-- bottom bread -->
    <rect x="${cx - bw / 2}" y="${cy}" width="${bw}" height="${bh * 0.7}" rx="${bh * 0.3}" fill="${C.crustLight}"/>
    <rect x="${cx - bw / 2}" y="${cy}" width="${bw}" height="${bh * 0.7}" rx="${bh * 0.3}" fill="url(#spot)"/>
    <!-- filling -->
    <rect x="${cx - bw / 2 + 6}" y="${cy - bh * 0.16}" width="${bw - 12}" height="${bh * 0.34}" rx="8" fill="${fill}"/>
    <rect x="${cx - bw / 2 + 6}" y="${cy - bh * 0.16}" width="${bw - 12}" height="6" fill="${C.rucola}" opacity="0.8"/>
    <!-- top bread -->
    <path d="M ${cx - bw / 2} ${cy - bh * 0.2} Q ${cx} ${cy - bh * 1.05} ${cx + bw / 2} ${cy - bh * 0.2} Z" fill="${C.crustDeep}"/>
    <path d="M ${cx - bw / 2} ${cy - bh * 0.2} Q ${cx} ${cy - bh * 1.0} ${cx + bw / 2} ${cy - bh * 0.2} Z" fill="${C.crustLight}"/>
    ${crumbs}`;
  return svgDoc(w, h, body);
}

function dessertSvg(slug, w, h) {
  const seed = hash(slug);
  const cx = w / 2;
  const cy = h / 2;
  const rad = Math.min(w, h) * 0.38;
  const theme =
    {
      "nutella-pizza": { base: "#5a3220", drizzle: "#3a1d10", bits: "#caa07a" },
      "lotus-biscoff-pizza": { base: "#c98a4a", drizzle: "#8a5526", bits: "#e9d3a8" },
      "pistachio-pizza": { base: "#9bbf6a", drizzle: "#6f9442", bits: "#3f6a2a" },
    }[slug] ?? { base: "#5a3220", drizzle: "#3a1d10", bits: "#caa07a" };
  const r = rng(seed);
  let drip = "";
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    const x0 = cx + Math.cos(a) * rad * 0.2;
    const y0 = cy + Math.sin(a) * rad * 0.2;
    const x1 = cx + Math.cos(a) * rad * 0.7;
    const y1 = cy + Math.sin(a) * rad * 0.7;
    drip += `<path d="M ${x0} ${y0} Q ${(x0 + x1) / 2 + (r() - 0.5) * 30} ${(y0 + y1) / 2} ${x1} ${y1}" stroke="${theme.drizzle}" stroke-width="${3 + r() * 4}" fill="none" stroke-linecap="round"/>`;
  }
  const bits = dots(cx, cy, rad, seed + 9, 16, theme.bits, 6);
  const body = `
    ${boardBg(w, h, seed)}
    <ellipse cx="${cx}" cy="${cy + rad * 0.08}" rx="${rad * 1.04}" ry="${rad * 0.98}" fill="#000" opacity="0.28" filter="url(#soft)"/>
    <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${C.crustLight}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${C.crustDeep}" stroke-width="${rad * 0.05}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad * 0.84}" fill="${theme.base}"/>
    <circle cx="${cx}" cy="${cy}" r="${rad * 0.84}" fill="url(#spot)"/>
    ${drip}${bits}
    <circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#spot)"/>`;
  return svgDoc(w, h, body);
}

function drinkSvg(slug, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const theme =
    {
      water: ["#cfe9f4", "#8fc6e3", "#5aa6d6"],
      pepsi: ["#0a2a6b", "#1452c8", "#d11", "#fff"],
      "coca-cola": ["#9e1a1a", "#d3201f", "#7a1212"],
      mirinda: ["#e57a16", "#f29a2e", "#b85a0c"],
      "mountain-dew": ["#7bbf3a", "#a8d84a", "#4f8a1f"],
      "7up": ["#3f9a5a", "#6fc079", "#2e7042"],
      sprite: ["#2f9a6a", "#5ec48f", "#1f7048"],
      fanta: ["#f07a14", "#ff9a2e", "#c25608"],
    }[slug] ?? ["#888", "#aaa", "#666"];
  const studio = `
    <rect width="${w}" height="${h}" fill="#ece7df"/>
    <rect y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="#d8d2c7"/>
    <ellipse cx="${cx}" cy="${h * 0.64}" rx="${w * 0.4}" ry="${h * 0.06}" fill="#fff" opacity="0.4" filter="url(#soft)"/>`;
  const canW = w * 0.24;
  const canH = h * 0.56;
  const x = cx - canW / 2;
  const y = cy - canH / 2;
  // shadow + reflection
  const shadow = `<ellipse cx="${cx}" cy="${y + canH + 6}" rx="${canW * 0.7}" ry="${canH * 0.07}" fill="#000" opacity="0.22" filter="url(#soft2)"/>`;
  const bands = theme
    .map(
      (col, i) =>
        `<rect x="${x}" y="${y + (canH / theme.length) * i}" width="${canW}" height="${canH / theme.length + 1}" fill="${col}"/>`,
    )
    .join("");
  const can = `
    <rect x="${x}" y="${y}" width="${canW}" height="${canH}" rx="${canW * 0.16}" fill="${theme[0]}"/>
    <clipPath id="canclip"><rect x="${x}" y="${y}" width="${canW}" height="${canH}" rx="${canW * 0.16}"/></clipPath>
    <g clip-path="url(#canclip)">${bands}
      <rect x="${x}" y="${y}" width="${canW * 0.22}" height="${canH}" fill="#fff" opacity="0.28"/>
      <rect x="${x + canW * 0.74}" y="${y}" width="${canW * 0.14}" height="${canH}" fill="#000" opacity="0.18"/>
    </g>
    <rect x="${x}" y="${y}" width="${canW}" height="${canH}" rx="${canW * 0.16}" fill="none" stroke="#0003" stroke-width="2"/>
    <ellipse cx="${cx}" cy="${y}" rx="${canW * 0.5}" ry="${canW * 0.12}" fill="#cdd2d4"/>
    <ellipse cx="${cx}" cy="${y}" rx="${canW * 0.42}" ry="${canW * 0.09}" fill="#9aa0a2"/>`;
  return svgDoc(w, h, `${studio}${shadow}${can}`);
}

// ---- editorial / hero / location -------------------------------------------
function heroSvg(w, h) {
  const seed = hash("hero");
  const cx = w * 0.5;
  const cy = h * 0.52;
  const rad = Math.min(w, h) * 0.46;
  const toppings =
    dots(cx, cy, rad, seed, 10, C.basil, 12) +
    dots(cx, cy, rad, seed + 3, 9, C.cheeseHi, 20) +
    dots(cx, cy, rad, seed + 7, 7, "#b13024", 13);
  return svgDoc(
    w,
    h,
    `${boardBg(w, h, seed)}
     <rect width="${w}" height="${h}" fill="#3a2414" opacity="0.18"/>
     ${pizzaBase(cx, cy, rad, seed)}${toppings}
     <circle cx="${cx}" cy="${cy}" r="${rad}" fill="url(#spot)"/>`,
  );
}

function articleSvg(kind, w, h) {
  const seed = hash("article-" + kind);
  if (kind === "welcome") {
    // offer tag / coupon scene
    const cx = w / 2;
    const cy = h / 2;
    return svgDoc(
      w,
      h,
      `<rect width="${w}" height="${h}" fill="${C.brand}"/>
       <rect width="${w}" height="${h}" fill="url(#spot)"/>
       ${(() => {
         const r = rng(seed);
         let s = "";
         for (let i = 0; i < 26; i++)
           s += `<circle cx="${r() * w}" cy="${r() * h}" r="${r() * 3 + 1}" fill="#fff" opacity="${r() * 0.2}"/>`;
         return s;
       })()}
       <g transform="rotate(-7 ${cx} ${cy})">
         <rect x="${cx - w * 0.32}" y="${cy - h * 0.16}" width="${w * 0.64}" height="${h * 0.32}" rx="14" fill="${C.linen}"/>
         <rect x="${cx - w * 0.32}" y="${cy - h * 0.16}" width="${w * 0.64}" height="${h * 0.32}" rx="14" fill="none" stroke="${C.azure}" stroke-width="4" stroke-dasharray="12 8"/>
         <circle cx="${cx - w * 0.32}" cy="${cy}" r="14" fill="${C.brand}"/>
         <circle cx="${cx + w * 0.32}" cy="${cy}" r="14" fill="${C.brand}"/>
         <text x="${cx}" y="${cy + 6}" font-family="Georgia, serif" font-style="italic" font-size="${h * 0.13}" fill="${C.brand}" text-anchor="middle" dominant-baseline="middle">on us</text>
       </g>`,
    );
  }
  if (kind === "lievito") {
    // dough close-up
    const r = rng(seed);
    let bubbles = "";
    for (let i = 0; i < 60; i++) {
      const x = r() * w;
      const y = r() * h;
      const s = 4 + r() * 26;
      bubbles += `<circle cx="${x}" cy="${y}" r="${s}" fill="#f0e3c4" opacity="0.9"/><circle cx="${x - s * 0.25}" cy="${y - s * 0.25}" r="${s * 0.4}" fill="#fff" opacity="0.5"/>`;
    }
    return svgDoc(w, h, `<rect width="${w}" height="${h}" fill="#e7d6ac"/>${bubbles}${vignetteOnly(w, h)}`);
  }
  // "seven" — a row/grid of small pizzas
  let pies = "";
  const cols = 4;
  const rows = 2;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      if (j === 1 && i >= 3) continue; // 7 pizzas
      const px = (w / cols) * (i + 0.5);
      const py = (h / rows) * (j + 0.5);
      const rad = Math.min(w / cols, h / rows) * 0.4;
      pies += pizzaBase(px, py, rad, seed + i * 13 + j * 7);
      pies += dots(px, py, rad, seed + i + j, 6, i % 2 ? C.basil : "#b13024", 7);
    }
  }
  return svgDoc(w, h, `${boardBg(w, h, seed)}${pies}`);
}

function locationSvg(w, h) {
  const horizon = h * 0.58;
  return svgDoc(
    w,
    h,
    `<rect width="${w}" height="${h}" fill="#d7e3ea"/>
     <rect y="${horizon}" width="${w}" height="${h - horizon}" fill="#c9bda6"/>
     <!-- storefront -->
     <rect x="${w * 0.16}" y="${h * 0.24}" width="${w * 0.68}" height="${horizon - h * 0.24}" fill="#efe7d8"/>
     <rect x="${w * 0.16}" y="${h * 0.24}" width="${w * 0.68}" height="${h * 0.12}" fill="${C.brand}"/>
     <text x="${w * 0.5}" y="${h * 0.32}" font-family="Georgia, serif" font-size="${h * 0.07}" fill="#fff" text-anchor="middle" dominant-baseline="middle" letter-spacing="3">NAPOLI 7</text>
     <!-- awning stripes -->
     ${(() => {
       let s = "";
       const n = 10;
       for (let i = 0; i < n; i++)
         s += `<rect x="${w * 0.16 + (w * 0.68 * i) / n}" y="${h * 0.36}" width="${(w * 0.68) / n}" height="${h * 0.05}" fill="${i % 2 ? C.flagRed ?? "#b13024" : "#efe7d8"}"/>`;
       return s;
     })()}
     <!-- door + windows -->
     <rect x="${w * 0.44}" y="${h * 0.43}" width="${w * 0.12}" height="${horizon - h * 0.43}" fill="${C.brand}" opacity="0.85"/>
     <rect x="${w * 0.2}" y="${h * 0.44}" width="${w * 0.18}" height="${h * 0.13}" fill="#9fc0d2" opacity="0.7"/>
     <rect x="${w * 0.62}" y="${h * 0.44}" width="${w * 0.18}" height="${h * 0.13}" fill="#9fc0d2" opacity="0.7"/>
     <!-- pavement -->
     ${(() => {
       let s = "";
       for (let i = 0; i < 6; i++)
         s += `<line x1="0" y1="${horizon + (i * (h - horizon)) / 6}" x2="${w}" y2="${horizon + (i * (h - horizon)) / 6}" stroke="#000" opacity="0.06"/>`;
       return s;
     })()}
     ${vignetteOnly(w, h)}`,
  );
}

function vignetteOnly(w, h) {
  return `<rect width="${w}" height="${h}" fill="url(#vign)"/>`;
}

function svgDoc(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${filters()}${body}${vignette(w, h)}</svg>`;
}

// ---- render with subtle photographic grain ----------------------------------
async function render(svg, w, h, outPath, quality = 76) {
  const noise = await sharp({
    create: { width: w, height: h, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 7 } },
  })
    .png()
    .toBuffer();
  await sharp(Buffer.from(svg))
    .resize(w, h)
    .composite([{ input: noise, blend: "soft-light" }])
    .jpeg({ quality, progressive: true, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toFile(outPath);
}

// ---- product catalog (slug -> category) ------------------------------------
const PRODUCTS = {
  pizza: ["margherita-classic", "vegetable-ortolana", "merguez", "diavola-piccante", "quattro-stagioni", "bresaola-truffle", "prosciutto-rucola"],
  focaccia: ["focaccia-vegetables", "focaccia-spicy-pepperoni", "focaccia-bresaola", "focaccia-veal-ham", "focaccia-prosciutto-rucola"],
  dessert: ["nutella-pizza", "lotus-biscoff-pizza", "pistachio-pizza"],
  drinks: ["water", "pepsi", "coca-cola", "mirinda", "mountain-dew", "7up", "sprite", "fanta"],
};

async function main() {
  await mkdir(PROD, { recursive: true });
  const PW = 800;
  const PH = 600;
  let n = 0;

  for (const slug of PRODUCTS.pizza) {
    await render(pizzaSvg(slug, PW, PH), PW, PH, path.join(PROD, `${slug}.jpg`));
    n++;
  }
  for (const slug of PRODUCTS.focaccia) {
    await render(focacciaSvg(slug, PW, PH), PW, PH, path.join(PROD, `${slug}.jpg`));
    n++;
  }
  for (const slug of PRODUCTS.dessert) {
    await render(dessertSvg(slug, PW, PH), PW, PH, path.join(PROD, `${slug}.jpg`));
    n++;
  }
  for (const slug of PRODUCTS.drinks) {
    await render(drinkSvg(slug, PW, PH), PW, PH, path.join(PROD, `${slug}.jpg`));
    n++;
  }

  // hero (wide)
  await render(heroSvg(1600, 1000), 1600, 1000, path.join(IMG, "hero-pizza.jpg"), 78);
  n++;
  // editorial
  await render(articleSvg("welcome", 1000, 750), 1000, 750, path.join(IMG, "article-welcome.jpg"));
  await render(articleSvg("lievito", 1000, 750), 1000, 750, path.join(IMG, "article-lievito.jpg"));
  await render(articleSvg("seven", 1000, 750), 1000, 750, path.join(IMG, "article-seven.jpg"));
  n += 3;
  // location (square)
  await render(locationSvg(1000, 1000), 1000, 1000, path.join(IMG, "location-block.jpg"));
  n++;

  console.log(`Generated ${n} images.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
