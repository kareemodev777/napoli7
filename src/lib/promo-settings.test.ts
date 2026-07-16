import { describe, expect, test } from "bun:test";
import {
  DEFAULT_MAX_PROMO_CODES_PER_ORDER,
  PROMO_CODES_HARD_CAP,
  normalizeMaxPromoCodesPerOrder,
} from "./promo-settings";

describe("normalizeMaxPromoCodesPerOrder", () => {
  test("keeps a sane whole number as-is", () => {
    expect(normalizeMaxPromoCodesPerOrder(8)).toBe(8);
    expect(normalizeMaxPromoCodesPerOrder(1)).toBe(1);
  });

  test("floors a fractional value", () => {
    expect(normalizeMaxPromoCodesPerOrder(8.9)).toBe(8);
  });

  test("clamps up to at least one — an order can always carry one code", () => {
    expect(normalizeMaxPromoCodesPerOrder(0)).toBe(1);
    expect(normalizeMaxPromoCodesPerOrder(-5)).toBe(1);
  });

  test("clamps down to the hard cap", () => {
    expect(normalizeMaxPromoCodesPerOrder(PROMO_CODES_HARD_CAP + 100)).toBe(
      PROMO_CODES_HARD_CAP,
    );
  });

  test("falls back to the default on a non-finite value", () => {
    expect(normalizeMaxPromoCodesPerOrder(NaN)).toBe(
      DEFAULT_MAX_PROMO_CODES_PER_ORDER,
    );
    expect(normalizeMaxPromoCodesPerOrder(Infinity)).toBe(
      DEFAULT_MAX_PROMO_CODES_PER_ORDER,
    );
  });
});
