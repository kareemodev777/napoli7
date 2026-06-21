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

  test("keeps persisted minimums above the default instead of capping them", () => {
    expect(
      normalizeDeliveryMinimumSubtotalAed(28),
    ).toBe(28);
  });

  test("allows delivery when the item subtotal alone reaches the minimum", () => {
    expect(
      meetsDeliveryMinimumAed({
        subtotalAed: 20,
        deliveryFeeAed: 12,
        minimumAed: 13,
      }),
    ).toBe(true);
  });

  test("ignores the delivery fee: a cheap item + big fee is still blocked", () => {
    // coca 4 AED + 12 AED delivery = 16, but the items alone are below 13.
    expect(
      meetsDeliveryMinimumAed({
        subtotalAed: 4,
        deliveryFeeAed: 12,
        minimumAed: 13,
      }),
    ).toBe(false);
  });

  test("blocks delivery when the item subtotal stays below the minimum", () => {
    expect(
      meetsDeliveryMinimumAed({
        subtotalAed: 5,
        deliveryFeeAed: 7,
        minimumAed: 13,
      }),
    ).toBe(false);
  });
});

