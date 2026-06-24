import { describe, expect, test } from "bun:test";
import {
  PASSWORD_CHANGE_PATH,
  PASSWORD_FORGOT_PATH,
  PASSWORD_RESET_CALLBACK_PATH,
  buildPasswordResetRedirect,
  buildRecoveryCallbackRedirect,
  isSafeRecoveryPath,
} from "./password-reset";

describe("password reset helpers", () => {
  test("sends reset emails straight to the change password page", () => {
    expect(buildPasswordResetRedirect("https://napoli7.com")).toBe(
      "https://napoli7.com/change-password",
    );
  });

  test("exports the auth paths in one place", () => {
    expect(PASSWORD_FORGOT_PATH).toBe("/forgot-password");
    expect(PASSWORD_CHANGE_PATH).toBe("/change-password");
    expect(PASSWORD_RESET_CALLBACK_PATH).toBe("/auth/callback");
  });

  test("can recover from a fallback redirect back into the callback flow", () => {
    expect(buildRecoveryCallbackRedirect("https://napoli7.com", "abc123")).toBe(
      "https://napoli7.com/auth/callback?code=abc123&next=%2Fchange-password",
    );
  });

  test("keeps recovery targets inside the app", () => {
    expect(isSafeRecoveryPath("/account")).toBe("/account");
    expect(isSafeRecoveryPath("//evil.com")).toBe("/change-password");
    expect(isSafeRecoveryPath("https://evil.com")).toBe("/change-password");
    expect(isSafeRecoveryPath(null)).toBe("/change-password");
  });
});
