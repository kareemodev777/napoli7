/**
 * Phone helpers for the registration anti-abuse guard. Pure (no IO) so the rules
 * are unit-tested and shared by the server action.
 */

/** Strip everything but digits, e.g. "+971 50 162 8577" -> "971501628577". */
export function normalizePhone(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

function isStrictRun(digits: string): boolean {
  let ascending = true;
  let descending = true;
  for (let i = 1; i < digits.length; i++) {
    const step = digits.charCodeAt(i) - digits.charCodeAt(i - 1);
    if (step !== 1) ascending = false;
    if (step !== -1) descending = false;
  }
  return ascending || descending;
}

/**
 * Heuristic guard against obviously fake / placeholder UAE mobiles. The register
 * form already enforces the +9715XXXXXXXX shape; this rejects numbers that match
 * the format but are clearly not real: all-identical digits, the 0000…
 * placeholder ranges people type to skip the field, and simple ascending /
 * descending runs (e.g. 12345678).
 *
 * It CANNOT prove a number is real — only an SMS OTP does that — it just filters
 * the low-effort junk so the launch offer can't be farmed with throwaway emails.
 */
export function isLikelyFakePhone(phone: string): boolean {
  const norm = normalizePhone(phone);
  // UAE mobile: country code 971 + a 5X operator prefix + 7 digits = 12 digits.
  if (!/^9715\d{8}$/.test(norm)) return true;

  // The 8 digits after the "9715" operator prefix.
  const local = norm.slice(4);
  if (/^(\d)\1{7}$/.test(local)) return true; // 00000000, 11111111, …
  if (/^0{5}/.test(local)) return true; // 00000xxx placeholder range
  if (isStrictRun(local)) return true; // 12345678 / 87654321
  return false;
}
