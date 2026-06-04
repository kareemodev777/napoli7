import { describe, expect, test } from "bun:test";
import { customerStatusMessage } from "./whatsapp";

describe("customerStatusMessage", () => {
  test("formats preparing updates", () => {
    expect(
      customerStatusMessage({
        orderNumber: "N7-00042",
        status: "preparing",
      }),
    ).toBe(
      "Napoli 7: your order N7-00042 is now being prepared in the kitchen 🍕",
    );
  });

  test("formats out-for-delivery updates", () => {
    expect(
      customerStatusMessage({
        orderNumber: "N7-00042",
        status: "out_for_delivery",
      }),
    ).toContain("on its way");
  });

  test("formats delivered updates", () => {
    expect(
      customerStatusMessage({
        orderNumber: "N7-00042",
        status: "delivered",
      }),
    ).toContain("delivered");
  });

  test("formats cancellation updates", () => {
    expect(
      customerStatusMessage({
        orderNumber: "N7-00042",
        status: "cancelled",
      }),
    ).toContain("cancelled");
  });
});
