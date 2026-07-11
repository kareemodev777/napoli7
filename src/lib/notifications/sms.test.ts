import { describe, expect, test } from "bun:test";
import { toSmsNumber } from "./sms";

// Twilio silently rejects anything that isn't E.164, so a number that looks fine
// to a human but is missing its + or its country code just never arrives. UAE
// customers type their mobile every which way; all of them have to land on the
// same +9715… string.
describe("toSmsNumber", () => {
  test("a local 05x mobile becomes +9715x", () => {
    expect(toSmsNumber("0509833501")).toBe("+971509833501");
  });

  test("an already-international number is preserved", () => {
    expect(toSmsNumber("+971509833501")).toBe("+971509833501");
    expect(toSmsNumber("971509833501")).toBe("+971509833501");
  });

  test("a bare national 5x number gets the UAE country code", () => {
    expect(toSmsNumber("509833501")).toBe("+971509833501");
  });

  test("spaces, dashes and brackets are ignored", () => {
    expect(toSmsNumber("+971 50 983 3501")).toBe("+971509833501");
    expect(toSmsNumber("050-983-3501")).toBe("+971509833501");
    expect(toSmsNumber("(050) 983 3501")).toBe("+971509833501");
  });

  test("every way of writing the same mobile agrees", () => {
    const forms = [
      "0509833501",
      "+971509833501",
      "971509833501",
      "509833501",
      "+971 50 983 3501",
      "050 983 3501",
    ];
    const normalized = new Set(forms.map(toSmsNumber));
    expect([...normalized]).toEqual(["+971509833501"]);
  });

  test("an empty phone yields nothing rather than a bogus +", () => {
    expect(toSmsNumber("")).toBe("");
    expect(toSmsNumber("   ")).toBe("");
  });
});
