import { describe, expect, test } from "bun:test";
import { isLikelyFakePhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  test("keeps only digits", () => {
    expect(normalizePhone("+971 50 162 8577")).toBe("971501628577");
    expect(normalizePhone("00971-50-1628577")).toBe("00971501628577");
  });
});

describe("isLikelyFakePhone", () => {
  test("accepts plausible UAE mobiles", () => {
    expect(isLikelyFakePhone("+971501628577")).toBe(false);
    expect(isLikelyFakePhone("+971581234560")).toBe(false);
    expect(isLikelyFakePhone("+971529847163")).toBe(false);
  });

  test("rejects the placeholder / sequential junk from real signups", () => {
    expect(isLikelyFakePhone("+971500000000")).toBe(true);
    expect(isLikelyFakePhone("+971500000001")).toBe(true);
    expect(isLikelyFakePhone("+971500000002")).toBe(true);
    expect(isLikelyFakePhone("+971512345678")).toBe(true); // ascending run
  });

  test("rejects all-identical and descending runs", () => {
    expect(isLikelyFakePhone("+971511111111")).toBe(true);
    expect(isLikelyFakePhone("+971587654321")).toBe(true);
  });

  test("rejects anything off the +9715XXXXXXXX shape", () => {
    expect(isLikelyFakePhone("+97144123456")).toBe(true); // landline 04, not 5X
    expect(isLikelyFakePhone("+12025550123")).toBe(true); // non-UAE
    expect(isLikelyFakePhone("")).toBe(true);
  });
});
