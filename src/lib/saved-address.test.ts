import { describe, expect, test } from "bun:test";
import { addressExists, addressKey, planAddressSave } from "./saved-address";

describe("addressKey / addressExists", () => {
  test("normalizes whitespace and case", () => {
    expect(addressKey({ street: "  Main  St ", area: "Al Jurf 2", flat: "12" })).toBe(
      "main st|al jurf 2|12",
    );
  });

  test("matches ignoring case and spacing; treats missing flat as empty", () => {
    const existing = [{ street: "Main St", area: "Al Jurf 2", flat: null }];
    expect(
      addressExists(existing, { street: "main st", area: "AL JURF 2" }),
    ).toBe(true);
    expect(
      addressExists(existing, { street: "Other Rd", area: "Al Jurf 2" }),
    ).toBe(false);
  });
});

describe("planAddressSave", () => {
  test("saves and defaults the first address", () => {
    expect(
      planAddressSave([], { street: "Main St", area: "Al Jurf 2" }),
    ).toEqual({ shouldSave: true, makeDefault: true });
  });

  test("saves a new address but does not force it as default", () => {
    const existing = [{ street: "Main St", area: "Al Jurf 2" }];
    expect(
      planAddressSave(existing, { street: "New Rd", area: "Al Jurf 3" }),
    ).toEqual({ shouldSave: true, makeDefault: false });
  });

  test("does not duplicate an address the customer already saved", () => {
    const existing = [{ street: "Main St", area: "Al Jurf 2", flat: "5" }];
    expect(
      planAddressSave(existing, { street: "main st", area: "al jurf 2", flat: "5" }),
    ).toEqual({ shouldSave: false, makeDefault: false });
  });
});
