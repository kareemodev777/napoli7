import { describe, expect, test } from "bun:test";
import { customerOrderView, paymentSummary } from "./order-display";

describe("paymentSummary", () => {
  test("COD is labelled regardless of payment status", () => {
    expect(paymentSummary("cod", "pending")).toEqual({
      label: "COD",
      tone: "cod",
    });
  });

  test("card states map to labels and tones", () => {
    expect(paymentSummary("card", "paid")).toEqual({
      label: "Card · Paid",
      tone: "paid",
    });
    expect(paymentSummary("card", "pending")).toEqual({
      label: "Card · Unpaid",
      tone: "unpaid",
    });
    expect(paymentSummary("card", "failed")).toEqual({
      label: "Card · Failed",
      tone: "unpaid",
    });
    expect(paymentSummary("card", "refunded").tone).toBe("warn");
    expect(paymentSummary("card", "disputed").tone).toBe("warn");
  });
});

describe("customerOrderView", () => {
  test("unpaid card order reads as awaiting payment, not its fulfilment status", () => {
    expect(
      customerOrderView({
        status: "received",
        paymentMethod: "card",
        paymentStatus: "pending",
      }),
    ).toEqual({ kind: "awaiting_payment" });
  });

  test("failed/expired card order reads as payment failed", () => {
    expect(
      customerOrderView({
        status: "received",
        paymentMethod: "card",
        paymentStatus: "failed",
      }),
    ).toEqual({ kind: "payment_failed" });
  });

  test("paid card order shows its fulfilment status", () => {
    expect(
      customerOrderView({
        status: "preparing",
        paymentMethod: "card",
        paymentStatus: "paid",
      }),
    ).toEqual({ kind: "status" });
  });

  test("COD always shows its fulfilment status", () => {
    expect(
      customerOrderView({
        status: "received",
        paymentMethod: "cod",
        paymentStatus: "pending",
      }),
    ).toEqual({ kind: "status" });
  });

  test("a cancelled card order shows its status, not a payment prompt", () => {
    expect(
      customerOrderView({
        status: "cancelled",
        paymentMethod: "card",
        paymentStatus: "pending",
      }),
    ).toEqual({ kind: "status" });
  });
});
