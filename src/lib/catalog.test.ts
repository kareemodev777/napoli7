import { expect, test } from "bun:test";
import type { ProductSize } from "@/data/types/catalog";
import { normalizeProductSizes } from "./catalog";

test("normalizeProductSizes collapses focaccia sizes to one visible option", () => {
  const sizes: ProductSize[] = [
    { id: "medium", label: "MEDIUM 30 CM", detail: "", price: 48 },
    { id: "small", label: "SMALL 24 CM", detail: "", price: 45 },
  ];

  expect(normalizeProductSizes("focaccia", sizes, 48)).toEqual([
    { id: "medium", label: "One size", detail: "", price: 48 },
  ]);
});

test("normalizeProductSizes keeps non-focaccia sizes unchanged", () => {
  const sizes: ProductSize[] = [
    { id: "medium", label: "MEDIUM 30 CM", detail: "", price: 28 },
    { id: "small", label: "SMALL 24 CM", detail: "", price: 22 },
  ];

  expect(normalizeProductSizes("pizza", sizes, 28)).toEqual(sizes);
});

test("normalizeProductSizes falls back to a regular size when no sizes exist", () => {
  expect(normalizeProductSizes("pizza", [], 28)).toEqual([
    { id: "regular", label: "Regular", detail: "", price: 28 },
  ]);
});
