import { describe, expect, test } from "bun:test";
import { generateOtpCode, hashOtpCode, verifyOtpHash } from "./otp";

describe("otp", () => {
  test("generates a zero-padded 6-digit code", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  test("verifies the right code and rejects the wrong one", () => {
    const phone = "971501628577";
    const code = "123456";
    const hash = hashOtpCode(phone, code);
    expect(verifyOtpHash(phone, code, hash)).toBe(true);
    expect(verifyOtpHash(phone, "654321", hash)).toBe(false);
  });

  test("hash is bound to the phone number", () => {
    const code = "123456";
    const hash = hashOtpCode("971501628577", code);
    expect(verifyOtpHash("971500000000", code, hash)).toBe(false);
  });

  test("verify is safe against a malformed stored hash", () => {
    expect(verifyOtpHash("971501628577", "123456", "not-hex")).toBe(false);
    expect(verifyOtpHash("971501628577", "123456", "")).toBe(false);
  });
});
