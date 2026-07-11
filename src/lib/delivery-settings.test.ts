import { describe, expect, test } from "bun:test";
import {
  amountToFreeDeliveryAed,
  computeOrderFeesAed,
  DEFAULT_DELIVERY_MIN_SUBTOTAL_AED,
  getDeliveryOrderTotalAed,
  meetsDeliveryMinimumAed,
  normalizeDeliveryMinimumSubtotalAed,
  qualifiesForFreeDelivery,
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

describe("service fee and free delivery", () => {
  test("pickup pays neither fee", () => {
    expect(
      computeOrderFeesAed({
        deliveryType: "pickup",
        subtotalAed: 50,
        zoneFeeAed: 9,
      }),
    ).toEqual({ deliveryFeeAed: 0, serviceFeeAed: 0 });
  });

  test("a normal delivery pays the zone fee plus the service fee", () => {
    expect(
      computeOrderFeesAed({
        deliveryType: "delivery",
        subtotalAed: 50,
        zoneFeeAed: 9,
      }),
    ).toEqual({ deliveryFeeAed: 9, serviceFeeAed: 3 });
  });

  // The rule the client was most specific about: free delivery waives the 9, and
  // ONLY the 9. The service fee survives it.
  test("free delivery waives the delivery fee but never the service fee", () => {
    expect(
      computeOrderFeesAed({
        deliveryType: "delivery",
        subtotalAed: 80,
        zoneFeeAed: 9,
      }),
    ).toEqual({ deliveryFeeAed: 0, serviceFeeAed: 3 });
  });

  test("the free-delivery threshold is inclusive at 80 AED", () => {
    expect(qualifiesForFreeDelivery(79.99)).toBe(false);
    expect(qualifiesForFreeDelivery(80)).toBe(true);
    expect(amountToFreeDeliveryAed(79.5)).toBe(0.5);
    expect(amountToFreeDeliveryAed(80)).toBe(0);
    expect(amountToFreeDeliveryAed(120)).toBe(0);
  });

  test("an 80 AED order still pays 3 AED, so it is not 'free' end to end", () => {
    const fees = computeOrderFeesAed({
      deliveryType: "delivery",
      subtotalAed: 80,
      zoneFeeAed: 9,
    });
    expect(
      getDeliveryOrderTotalAed({ subtotalAed: 80, ...fees }),
    ).toBe(83);
  });
});

describe("delivery minimum total helpers", () => {
  test("both fees are part of the order total", () => {
    expect(
      getDeliveryOrderTotalAed({
        subtotalAed: 20,
        deliveryFeeAed: 9,
        serviceFeeAed: 3,
      }),
    ).toBe(32);
  });

  test("a discount comes off the items, not the fees", () => {
    expect(
      getDeliveryOrderTotalAed({
        subtotalAed: 30,
        deliveryFeeAed: 9,
        serviceFeeAed: 3,
        discountAed: 19,
      }),
    ).toBe(23); // (30 - 19) + 9 + 3 — the fees survive the discount
  });

  test("a discount larger than the items still leaves the fees payable", () => {
    expect(
      getDeliveryOrderTotalAed({
        subtotalAed: 19,
        deliveryFeeAed: 9,
        serviceFeeAed: 3,
        discountAed: 19,
      }),
    ).toBe(12);
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

