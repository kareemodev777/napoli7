import { describe, expect, test } from "bun:test";
import {
  DEFAULT_DELIVERY_MIN_SUBTOTAL_AED,
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
