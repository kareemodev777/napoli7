import { test, expect, describe } from "bun:test";
import {
  toFils,
  buildCheckoutLines,
  grossFils,
  netFils,
  buildAndAssertCheckoutAmount,
} from "./amounts";

describe("toFils", () => {
  test("rounds AED to integer fils", () => {
    expect(toFils(10)).toBe(1000);
    expect(toFils(12.5)).toBe(1250);
    expect(toFils(0)).toBe(0);
    // 0.1 + 0.2 style float dust must not leak through
    expect(toFils(35.7)).toBe(3570);
  });
});

describe("buildCheckoutLines", () => {
  test("one line per item, label carries qty when > 1", () => {
    const lines = buildCheckoutLines(
      [
        { name: "Margherita", qty: 2, lineTotalAed: 70 },
        { name: "Coke", qty: 1, lineTotalAed: 6 },
      ],
      0,
    );
    expect(lines).toEqual([
      { name: "2 × Margherita", unitAmountFils: 7000 },
      { name: "Coke", unitAmountFils: 600 },
    ]);
  });

  test("appends a delivery line only when fee > 0", () => {
    const withFee = buildCheckoutLines(
      [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
      15,
    );
    expect(withFee).toHaveLength(2);
    expect(withFee[1]).toEqual({ name: "Delivery fee", unitAmountFils: 1500 });

    const noFee = buildCheckoutLines(
      [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
      0,
    );
    expect(noFee).toHaveLength(1);
  });
});

describe("grossFils / netFils", () => {
  const lines = buildCheckoutLines(
    [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
    15,
  );
  test("gross sums all lines", () => {
    expect(grossFils(lines)).toBe(5500);
  });
  test("net subtracts discount", () => {
    expect(netFils(lines, 10)).toBe(4500);
  });
});

describe("buildAndAssertCheckoutAmount", () => {
  test("plain order, pickup, no promo — charges item subtotal", () => {
    const r = buildAndAssertCheckoutAmount({
      items: [
        { name: "Margherita", qty: 2, lineTotalAed: 70 },
        { name: "Coke", qty: 1, lineTotalAed: 6 },
      ],
      deliveryFeeAed: 0,
      discountAed: 0,
      totalAed: 76,
    });
    expect(r.netFils).toBe(7600);
    expect(r.expectedFils).toBe(7600);
    expect(r.lines).toHaveLength(2);
  });

  test("delivery fee is included in the charge", () => {
    const r = buildAndAssertCheckoutAmount({
      items: [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
      deliveryFeeAed: 15,
      discountAed: 0,
      totalAed: 55,
    });
    expect(r.netFils).toBe(5500);
    expect(r.lines).toHaveLength(2);
  });

  test("fixed-AED promo discount is applied", () => {
    // NAPOLI20: 20 AED off an 80 AED subtotal + 10 delivery = 70 total
    const r = buildAndAssertCheckoutAmount({
      items: [{ name: "Family deal", qty: 1, lineTotalAed: 80 }],
      deliveryFeeAed: 10,
      discountAed: 20,
      totalAed: 70,
    });
    expect(r.netFils).toBe(7000);
    expect(r.discountFils).toBe(2000);
  });

  test("percentage promo discount is applied", () => {
    // WELCOME10: 10% off 50 AED = 5 discount; +12 delivery = 57 total
    const r = buildAndAssertCheckoutAmount({
      items: [{ name: "Pizza", qty: 1, lineTotalAed: 50 }],
      deliveryFeeAed: 12,
      discountAed: 5,
      totalAed: 57,
    });
    expect(r.netFils).toBe(5700);
  });

  test("combined promo + delivery + multi-item reconciles exactly", () => {
    const r = buildAndAssertCheckoutAmount({
      items: [
        { name: "Diavola", qty: 2, lineTotalAed: 90 },
        { name: "Water", qty: 3, lineTotalAed: 9 },
      ],
      deliveryFeeAed: 18,
      discountAed: 9.9,
      totalAed: 107.1, // 99 - 9.9 + 18
    });
    expect(r.netFils).toBe(10710);
    expect(r.expectedFils).toBe(10710);
  });

  test("THROWS when the computed amount does not equal total_aed", () => {
    // delivery fee silently dropped from total — the exact bug F1 guards against
    expect(() =>
      buildAndAssertCheckoutAmount({
        items: [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
        deliveryFeeAed: 15,
        discountAed: 0,
        totalAed: 40, // wrong: should be 55
      }),
    ).toThrow(/mismatch/);
  });

  test("THROWS when discount exceeds gross", () => {
    expect(() =>
      buildAndAssertCheckoutAmount({
        items: [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
        deliveryFeeAed: 0,
        discountAed: 50,
        totalAed: -10,
      }),
    ).toThrow();
  });

  test("THROWS on negative inputs", () => {
    expect(() =>
      buildAndAssertCheckoutAmount({
        items: [{ name: "Pizza", qty: 1, lineTotalAed: 40 }],
        deliveryFeeAed: -5,
        discountAed: 0,
        totalAed: 35,
      }),
    ).toThrow();
  });
});
