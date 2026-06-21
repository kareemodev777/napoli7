import { expect, test } from "bun:test";
import type { ProductSize } from "@/data/types/catalog";
import { PRODUCTS } from "./catalog";

test("focaccia products no longer expose the removed 24 cm and 30 cm sizes", () => {
  const focacciaProducts = PRODUCTS.filter((product) => product.categoryId === "focaccia");

  expect(focacciaProducts.length).toBeGreaterThan(0);
  for (const product of focacciaProducts) {
    const sizes = product.sizes as ProductSize[];
    expect(sizes).toHaveLength(1);
    expect(sizes[0]?.label).toBe("One size");
    expect(sizes[0]?.detail).toBe("");
    expect(sizes.map((size: ProductSize) => size.detail)).not.toContain("24 cm");
    expect(sizes.map((size: ProductSize) => size.detail)).not.toContain("30 cm");
  }
});
