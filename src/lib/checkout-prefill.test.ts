import { describe, expect, test } from "bun:test";
import {
  buildCheckoutInitialDetails,
  chooseCheckoutArea,
  splitCustomerName,
} from "./checkout-prefill";

describe("checkout prefill helpers", () => {
  test("builds contact details from registration metadata", () => {
    const details = buildCheckoutInitialDetails({
      email: "guest@example.com",
      metadata: {
        first_name: "Abdul",
        last_name: "Kareem",
        mobile: "+971501234567",
      },
      address: {
        street: "Tower 7, Corniche Road",
        area: "Al Jurf 2",
        flat: "1204",
        notes: "Call on arrival",
      },
    });

    expect(details).toEqual({
      firstName: "Abdul",
      lastName: "Kareem",
      phone: "+971501234567",
      email: "guest@example.com",
      deliveryAddress: {
        street: "Tower 7, Corniche Road",
        area: "Al Jurf 2",
        flat: "1204",
        notes: "Call on arrival",
      },
    });
  });

  test("falls back to splitting a full name from provider metadata", () => {
    expect(
      buildCheckoutInitialDetails({
        email: "maria@example.com",
        metadata: { full_name: "Maria Rossi" },
      }),
    ).toMatchObject({
      firstName: "Maria",
      lastName: "Rossi",
      email: "maria@example.com",
    });
  });

  test("chooses saved address area only when it is still a delivery zone", () => {
    const zones = [{ area: "Al Jurf 2" }, { area: "Al Nuaimiya" }];

    expect(chooseCheckoutArea({ zones, preferredArea: "Al Nuaimiya" })).toBe(
      "Al Nuaimiya",
    );
    expect(chooseCheckoutArea({ zones, preferredArea: "Dubai Marina" })).toBe(
      "Al Jurf 2",
    );
  });

  test("splits single and multi-part names safely", () => {
    expect(splitCustomerName("Abdul Kareem Ghani")).toEqual({
      firstName: "Abdul",
      lastName: "Kareem Ghani",
    });
    expect(splitCustomerName("Napoli")).toEqual({ firstName: "Napoli" });
    expect(splitCustomerName("   ")).toEqual({});
  });
});
