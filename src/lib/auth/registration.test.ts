import { describe, expect, test } from "bun:test";
import {
  EMAIL_VERIFY_PATH,
  buildEmailVerificationRedirect,
} from "./registration";

describe("registration helpers", () => {
  test("send new signups to the verify email page", () => {
    expect(buildEmailVerificationRedirect("https://napoli7.com", "ak@example.com")).toBe(
      "https://napoli7.com/verify-email?email=ak%40example.com",
    );
  });

  test("exports the email verification path in one place", () => {
    expect(EMAIL_VERIFY_PATH).toBe("/verify-email");
  });
});