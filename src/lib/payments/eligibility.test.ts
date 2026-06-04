import { describe, expect, test } from "bun:test";
import {
  cardCheckoutEligibility,
  canFulfillCompletedCheckout,
} from "./eligibility";

describe("cardCheckoutEligibility", () => {
  test("allows a pending, non-cancelled card order", () => {
    expect(
      cardCheckoutEligibility({
        status: "received",
        paymentMethod: "card",
        paymentStatus: "pending",
      }),
    ).toEqual({ ok: true });
  });

  test("blocks COD orders", () => {
    expect(
      cardCheckoutEligibility({
        status: "received",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }).ok,
    ).toBe(false);
  });

  test("blocks cancelled card orders", () => {
    const result = cardCheckoutEligibility({
      status: "cancelled",
      paymentMethod: "card",
      paymentStatus: "pending",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("cancelled");
  });

  test("redirects already-paid orders instead of creating a new session", () => {
    expect(
      cardCheckoutEligibility({
        status: "received",
        paymentMethod: "card",
        paymentStatus: "paid",
      }),
    ).toEqual({
      ok: false,
      alreadyPaid: true,
      reason: "This order is already paid.",
    });
  });
});

describe("canFulfillCompletedCheckout", () => {
  test("never fulfills a cancelled order", () => {
    expect(canFulfillCompletedCheckout({ status: "cancelled" })).toBe(false);
  });

  test("allows non-cancelled orders", () => {
    expect(canFulfillCompletedCheckout({ status: "received" })).toBe(true);
  });
});
