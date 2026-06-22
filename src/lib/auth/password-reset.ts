import { SITE_URL } from "@/lib/env";

export const PASSWORD_FORGOT_PATH = "/forgot-password";
export const PASSWORD_CHANGE_PATH = "/change-password";
export const PASSWORD_RESET_CALLBACK_PATH = "/auth/callback";

export function buildPasswordResetRedirect(baseUrl = SITE_URL) {
  const url = new URL(PASSWORD_RESET_CALLBACK_PATH, baseUrl);
  url.searchParams.set("next", PASSWORD_CHANGE_PATH);
  return url.toString();
}

export function buildRecoveryCallbackRedirect(
  baseUrl = SITE_URL,
  code: string,
) {
  const url = new URL(PASSWORD_RESET_CALLBACK_PATH, baseUrl);
  url.searchParams.set("code", code);
  url.searchParams.set("next", PASSWORD_CHANGE_PATH);
  return url.toString();
}

export function isSafeRecoveryPath(next: string | null | undefined) {
  if (!next) return PASSWORD_CHANGE_PATH;
  if (!next.startsWith("/") || next.startsWith("//")) return PASSWORD_CHANGE_PATH;
  return next;
}
