import { describe, expect, test } from "bun:test";
import { comparePosCatalog, type PosCatalogProduct } from "./catalog";
import type { PosSkuEntry } from "./sku-map";

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
    const report = comparePosCatalog(entries, pos);
    expect(report.total).toBe(3);
    expect(report.matched).toBe(3);
    expect(report.issues).toHaveLength(0);
  });

  test("flags a SKU the POS no longer has", () => {
    const pos: PosCatalogProduct[] = [
      { productName: "Margherita", sku: "MAR-0001", sellingPrice: 28 },
      { productName: "Tonno (Tuna)", sku: "TON-0003", sellingPrice: 43 },
    ];
    const report = comparePosCatalog(entries, pos);
    expect(report.matched).toBe(2);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      sku: "OLD-9999",
      kind: "missing_sku",
    });
  });

  test("flags a drifted POS price", () => {
    const pos: PosCatalogProduct[] = [
      { productName: "Margherita", sku: "MAR-0001", sellingPrice: 32 },
      { productName: "Tonno (Tuna)", sku: "TON-0003", sellingPrice: 43 },
      { productName: "Old Pizza", sku: "OLD-9999", sellingPrice: 30 },
    ];
    const report = comparePosCatalog(entries, pos);
    expect(report.matched).toBe(2);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0]).toMatchObject({
      sku: "MAR-0001",
      kind: "price_drift",
      expectedPosPrice: 28,
      livePosPrice: 32,
    });
  });
});
