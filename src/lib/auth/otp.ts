import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/** How long a freshly-issued code stays valid. */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** Minimum gap between two code sends to the same number (anti-spam). */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Wrong-code attempts allowed before the code is burned. */
export const OTP_MAX_ATTEMPTS = 5;

/** Cryptographically-random 6-digit code, zero-padded. */
export function generateOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Hash a code for storage. We never persist the plaintext OTP. A SHA-256 over
 * phone + code (peppered with OTP_PEPPER when set) is sufficient for a 6-digit,
 * short-lived, attempt-limited secret.
 */
export function hashOtpCode(phoneNorm: string, code: string): string {
  const pepper = process.env.OTP_PEPPER ?? "";
  return createHash("sha256")
    .update(`${phoneNorm}:${code}:${pepper}`)
    .digest("hex");
}

/** Constant-time comparison of a candidate code against a stored hash. */
export function verifyOtpHash(
  phoneNorm: string,
  code: string,
  storedHash: string,
): boolean {
  const candidate = Buffer.from(hashOtpCode(phoneNorm, code), "hex");
  const stored = Buffer.from(storedHash, "hex");
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}
