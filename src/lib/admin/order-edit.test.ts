import { describe, expect, test } from "bun:test";
import {
  computeOrderTotals,
  describeEdit,
  lineTotal,
  paymentDifference,
  unitPriceFromLine,
} from "./order-edit";

describe("lineTotal / unitPriceFromLine", () => {
  test("multiplies and rounds; floors at zero", () => {
    expect(lineTotal(12.5, 3)).toBe(37.5);
    expect(lineTotal(0, 3)).toBe(0);
    expect(lineTotal(10, 0)).toBe(0);
  });

  test("recovers unit price from a stored line", () => {
    expect(unitPriceFromLine(37.5, 3)).toBe(12.5);
    expect(unitPriceFromLine(50, 0)).toBe(0);
  });
});

describe("computeOrderTotals", () => {
  test("sums lines, clamps discount to subtotal, adds both fees", () => {
    const totals = computeOrderTotals(
      [
        { unitPriceAed: 30, quantity: 2 },
        { unitPriceAed: 15, quantity: 1 },
      ],
      10,
      3,
      20,
    );
    expect(totals.subtotalAed).toBe(75);
    expect(totals.deliveryFeeAed).toBe(10);
    expect(totals.serviceFeeAed).toBe(3);
    expect(totals.discountAed).toBe(20);
    expect(totals.totalAed).toBe(68); // 75 - 20 + 10 + 3
  });

  test("discount cannot exceed subtotal", () => {
    const totals = computeOrderTotals(
      [{ unitPriceAed: 10, quantity: 1 }],
      5,
      3,
      999,
    );
    expect(totals.discountAed).toBe(10);
    expect(totals.totalAed).toBe(8); // 10 - 10 + 5 + 3
  });

  // An admin edit must never re-price the order: the fee it was given is the fee
  // it returns, even if the edited subtotal would now qualify for free delivery.
  test("carries the service fee through untouched", () => {
    const totals = computeOrderTotals([{ unitPriceAed: 100, quantity: 1 }], 0, 3, 0);
    expect(totals.serviceFeeAed).toBe(3);
    expect(totals.totalAed).toBe(103);
  });

  test("dropping a line (qty 0) removes it from subtotal", () => {
    const totals = computeOrderTotals(
      [
        { unitPriceAed: 30, quantity: 0 },
        { unitPriceAed: 15, quantity: 2 },
      ],
      0,
      0,
    );
    expect(totals.subtotalAed).toBe(30);
  });
});

describe("paymentDifference", () => {
  test("positive means collect", () => {
    expect(paymentDifference(50, 65)).toEqual({
      differenceAed: 15,
      direction: "collect",
    });
  });
  test("negative means refund", () => {
    expect(paymentDifference(65, 50)).toEqual({
      differenceAed: -15,
      direction: "refund",
    });
  });
  test("equal means none", () => {
    expect(paymentDifference(50, 50)).toEqual({
      differenceAed: 0,
      direction: "none",
    });
  });
});

describe("describeEdit", () => {
  test("summarises a collection with handling + note", () => {
    const summary = describeEdit({
      oldTotalAed: 50,
      newTotalAed: 65,
      paymentHandling: "cash_collected",
      note: "Added garlic bread",
    });
    expect(summary).toContain("50.00 AED → 65.00 AED");
    expect(summary).toContain("Collect 15.00 AED");
    expect(summary).toContain("cash collected");
    expect(summary).toContain("Note: Added garlic bread");
  });

  test("notes an unchanged total", () => {
    expect(
      describeEdit({
        oldTotalAed: 40,
        newTotalAed: 40,
        paymentHandling: "none",
      }),
    ).toContain("Total unchanged at 40.00 AED");
  });
});
