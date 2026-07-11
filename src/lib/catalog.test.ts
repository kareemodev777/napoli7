import { expect, test } from "bun:test";
import type { ProductSize } from "@/data/types/catalog";
import { normalizeProductSizes } from "./catalog";

// This used to collapse focaccia to a single "One size" option, discarding every
// size but the first — which is exactly how the small focaccia vanished from the
// menu. Sizes are the catalogue's business; no category is special.
test("normalizeProductSizes keeps every size a focaccia offers", () => {
  const sizes: ProductSize[] = [
    { id: "regular", label: "Regular", detail: "", price: 48 },
    { id: "small", label: "Small", detail: "", price: 35 },
  ];

  expect(normalizeProductSizes(sizes, 48)).toEqual(sizes);
});

test("normalizeProductSizes keeps pizza sizes unchanged", () => {
  const sizes: ProductSize[] = [
    { id: "medium", label: "MEDIUM 30 CM", detail: "", price: 28 },
    { id: "small", label: "SMALL 24 CM", detail: "", price: 22 },
  ];

  expect(normalizeProductSizes(sizes, 28)).toEqual(sizes);
});

test("normalizeProductSizes falls back to a regular size when no sizes exist", () => {
  expect(normalizeProductSizes([], 28)).toEqual([
    { id: "regular", label: "Regular", detail: "", price: 28 },
  ]);
});
