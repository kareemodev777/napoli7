import { describe, expect, test } from "bun:test";
import { promoRedemptionWasConsumed } from "./promo";

describe("promoRedemptionWasConsumed", () => {
  test("COD promo is consumed at placement", () => {
    expect(
      promoRedemptionWasConsumed({
        promoCode: "WELCOME10",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }),
    ).toBe(true);
  });

  test("card promo is consumed only after payment succeeds", () => {
    expect(
      promoRedemptionWasConsumed({
        promoCode: "WELCOME10",
        paymentMethod: "card",
        paymentStatus: "pending",
      }),
    ).toBe(false);
    expect(
      promoRedemptionWasConsumed({
        promoCode: "WELCOME10",
        paymentMethod: "card",
        paymentStatus: "paid",
      }),
    ).toBe(true);
  });

  test("orders without a promo do not need restoration", () => {
    expect(
      promoRedemptionWasConsumed({
        promoCode: null,
        paymentMethod: "cod",
        paymentStatus: "pending",
      }),
    ).toBe(false);
  });
});
