export const EMAIL_VERIFY_PATH = "/verify-email";

export function buildEmailVerificationRedirect(siteUrl: string, email: string) {
  const url = new URL(EMAIL_VERIFY_PATH, siteUrl);
  url.searchParams.set("email", email);
  return url.toString();
}