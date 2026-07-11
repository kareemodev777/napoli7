import { describe, expect, test } from "bun:test";
import {
  comparePosCatalog,
  type PosCatalogProduct,
  type SitePrice,
} from "./catalog";
import type { PosSkuEntry } from "./sku-map";

// What the website charges today. Drift is measured site-vs-POS, so this — not
// the SKU map's snapshot — is the number the POS is expected to agree with.
const sitePrices: SitePrice[] = [
  { name: "Margherita", size: "regular", priceAed: 28 },
  { name: "Tonno (Tuna)", size: "regular", priceAed: 43 },
  { name: "Old Pizza", size: "regular", priceAed: 30 },
];

const entries: PosSkuEntry[] = [
  {
    name: "Margherita",
    size: "regular",
    price: 28,
    sku: "MAR-0001",
    posName: "Margherita",
    posPrice: 28,
  },
  {
    name: "Tonno (Tuna)",
    size: "regular",
    price: 43,
    sku: "TON-0003",
    posName: "Tonno (Tuna)",
    posPrice: 43,
  },
  {
    name: "Old Pizza",
    size: "regular",
    price: 30,
    sku: "OLD-9999",
    posName: "Old Pizza",
    posPrice: 30,
  },
];

describe("comparePosCatalog", () => {
  test("counts a clean match", () => {
    const pos: PosCatalogProduct[] = [
      { productName: "Margherita", sku: "MAR-0001", sellingPrice: 28 },
      { productName: "Tonno (Tuna)", sku: "TON-0003", sellingPrice: 43 },
      { productName: "Old Pizza", sku: "OLD-9999", sellingPrice: 30 },
    ];
    const report = comparePosCatalog(entries, pos, sitePrices);
    expect(report.total).toBe(3);
    expect(report.matched).toBe(3);
    expect(report.issues).toHaveLength(0);
  });

  test("flags a SKU the POS no longer has", () => {
    const pos: PosCatalogProduct[] = [
      { productName: "Margherita", sku: "MAR-0001", sellingPrice: 28 },
      { productName: "Tonno (Tuna)", sku: "TON-0003", sellingPrice: 43 },
    ];
    const report = comparePosCatalog(entries, pos, sitePrices);
    expect(report.matched).toBe(2);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      sku: "OLD-9999",
      kind: "missing_sku",
    });
  });

  test("flags a POS price that disagrees with the website", () => {
    const pos: PosCatalogProduct[] = [
      { productName: "Margherita", sku: "MAR-0001", sellingPrice: 32 },
      { productName: "Tonno (Tuna)", sku: "TON-0003", sellingPrice: 43 },
      { productName: "Old Pizza", sku: "OLD-9999", sellingPrice: 30 },
    ];
    const report = comparePosCatalog(entries, pos, sitePrices);
    expect(report.matched).toBe(2);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      sku: "MAR-0001",
      kind: "price_drift",
      expectedPosPrice: 28, // what the website charges
      livePosPrice: 32, // what the POS charges
    });
  });

  // The false alarm this rewrite exists to kill. Frutti Di Mare was raised to 53
  // on BOTH the website and the POS — they agreed perfectly — but the SKU map still
  // held the old 44, so the report cried drift between two systems that were in
  // sync. Drift must mean "the site and the POS disagree", nothing else.
  test("no drift when the site and the POS agree, even if the SKU map is stale", () => {
    const staleMap: PosSkuEntry[] = [
      {
        name: "Frutti Di Mare (Seafood Pizza)",
        size: "regular",
        price: 44, // stale snapshot
        sku: "FRU-0005",
        posName: "Frutti Di Mare (Seafood Pizza)",
        posPrice: 44, // stale snapshot
      },
    ];
    const report = comparePosCatalog(
      staleMap,
      [
        {
          productName: "Frutti Di Mare (Seafood Pizza)",
          sku: "FRU-0005",
          sellingPrice: 53,
        },
      ],
      [
        {
          name: "Frutti Di Mare (Seafood Pizza)",
          size: "regular",
          priceAed: 53,
        },
      ],
    );
    expect(report.issues).toHaveLength(0);
    expect(report.matched).toBe(1);
  });

  test("still flags a real disagreement when the site price moves alone", () => {
    const report = comparePosCatalog(
      entries,
      [{ productName: "Margherita", sku: "MAR-0001", sellingPrice: 28 }],
      [{ name: "Margherita", size: "regular", priceAed: 35 }],
    );
    expect(report.issues[0]).toMatchObject({
      sku: "MAR-0001",
      kind: "price_drift",
      expectedPosPrice: 35, // the site was raised…
      livePosPrice: 28, // …and the POS was not
    });
  });
});
