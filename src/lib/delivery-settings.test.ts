import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DELIVERY_MIN_SUBTOTAL_AED,
  getDeliveryOrderTotalAed,
  meetsDeliveryMinimumAed,
  normalizeDeliveryMinimumSubtotalAed,
} from "./delivery-settings";

describe("normalizeDeliveryMinimumSubtotalAed", () => {
  test("rounds to 2 decimals and clamps negative values", () => {
    expect(normalizeDeliveryMinimumSubtotalAed(27.994)).toBe(27.99);
    expect(normalizeDeliveryMinimumSubtotalAed(27.995)).toBe(28);
    expect(normalizeDeliveryMinimumSubtotalAed(-4)).toBe(0);
  });

  test("falls back to the default when the input is not finite", () => {
    expect(normalizeDeliveryMinimumSubtotalAed(Number.NaN)).toBe(
      DEFAULT_DELIVERY_MIN_SUBTOTAL_AED,
    );
  });
});

describe("delivery minimum total helpers", () => {
  test("treats delivery fee as part of the order total", () => {
    expect(
      getDeliveryOrderTotalAed({ subtotalAed: 20, deliveryFeeAed: 12 }),
    ).toBe(32);
  });

  test("allows delivery when subtotal plus fee reaches the minimum", () => {
    expect(
      meetsDeliveryMinimumAed({
        subtotalAed: 20,
        deliveryFeeAed: 12,
        minimumAed: 13,
      }),
    ).toBe(true);
  });

  test("blocks delivery when the final total stays below the minimum", () => {
    expect(
      meetsDeliveryMinimumAed({
        subtotalAed: 5,
        deliveryFeeAed: 7,
        minimumAed: 13,
      }),
    ).toBe(false);
  });
});

