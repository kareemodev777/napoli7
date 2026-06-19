import { describe, expect, test } from "bun:test";
import {
  PASSWORD_RESET_PATH,
  buildPasswordResetRedirect,
} from "./password-reset";

describe("buildPasswordResetRedirect", () => {
  test("sends reset emails to the dedicated reset page", () => {
    expect(buildPasswordResetRedirect("https://napoli7.com")).toBe(
      "https://napoli7.com/reset-password",
    );
  });

  test("exports the reset page path in one place", () => {
    expect(PASSWORD_RESET_PATH).toBe("/reset-password");
  });
});
