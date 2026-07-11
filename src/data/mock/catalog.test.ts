import { expect, test } from "bun:test";
import type { ProductSize } from "@/data/types/catalog";
import { PRODUCTS } from "./catalog";

// Focaccia sizes were once removed wholesale, because they had been given the
// pizzas' "24 cm" / "30 cm" details, which are not true of a focaccia. That threw
// out the small along with the wrong dimensions, and the small focaccia went off
// the menu. Both halves matter: the small is offered, and neither size claims a
// diameter nobody has measured.
test("focaccia is offered in both sizes", () => {
  const focacciaProducts = PRODUCTS.filter(
    (product) => product.categoryId === "focaccia",
  );

  expect(focacciaProducts.length).toBeGreaterThan(0);
  for (const product of focacciaProducts) {
    const sizes = product.sizes as ProductSize[];
    expect(`${product.name}: ${sizes.map((s) => s.label).join(", ")}`).toBe(
      `${product.name}: Regular, Small`,
    );
    // The small must be the cheaper one, or the picker is nonsense.
    const regular = sizes.find((s) => s.id === "regular")!;
    const small = sizes.find((s) => s.id === "small")!;
    expect(small.price).toBeLessThan(regular.price);
  }
});

test("no focaccia size claims a pizza's dimensions", () => {
  const focacciaProducts = PRODUCTS.filter(
    (product) => product.categoryId === "focaccia",
  );

  for (const product of focacciaProducts) {
    for (const size of product.sizes as ProductSize[]) {
      expect(size.detail).toBe("");
    }
  }
});
