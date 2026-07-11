import { describe, expect, test } from "bun:test";
import {
  displayEmail,
  isPlaceholderEmail,
  placeholderEmailForPhone,
} from "./placeholder-email";

describe("placeholder email for phone-only accounts", () => {
  test("is derived from the mobile, so it is stable and unique per customer", () => {
    expect(placeholderEmailForPhone("+971509833501")).toBe(
      "p971509833501@phone.napoli7.invalid",
    );
    // Same number written differently must land on the same address, or one
    // customer could claim the signup reward twice.
    expect(placeholderEmailForPhone("+971 50 983 3501")).toBe(
      placeholderEmailForPhone("+971509833501"),
    );
  });

  test("is recognisable, so nothing is ever mailed to it", () => {
    expect(isPlaceholderEmail(placeholderEmailForPhone("+971509833501"))).toBe(
      true,
    );
    expect(isPlaceholderEmail("marco@gmail.com")).toBe(false);
    expect(isPlaceholderEmail(null)).toBe(false);
    expect(isPlaceholderEmail(undefined)).toBe(false);
  });

  // .invalid is reserved (RFC 2606) and can never resolve. If one ever escapes to
  // a mail provider it bounces loudly instead of vanishing.
  test("uses a domain that cannot exist", () => {
    expect(placeholderEmailForPhone("+971509833501")).toEndWith(".invalid");
  });

  test("shows as blank in a form, never as a synthetic address", () => {
    expect(displayEmail(placeholderEmailForPhone("+971509833501"))).toBe("");
    expect(displayEmail("marco@gmail.com")).toBe("marco@gmail.com");
    expect(displayEmail(null)).toBe("");
  });
});
