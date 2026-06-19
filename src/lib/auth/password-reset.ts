import { SITE_URL } from "@/lib/env";

export const PASSWORD_RESET_PATH = "/reset-password";

export function buildPasswordResetRedirect(baseUrl = SITE_URL) {
  return new URL(PASSWORD_RESET_PATH, baseUrl).toString();
}
