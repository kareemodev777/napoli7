/**
 * Phone helpers for the registration anti-abuse guard. Pure (no IO) so the rules
 * are unit-tested and shared by the server action.
 */

/** Strip everything but digits, e.g. "+971 50 162 8577" -> "971501628577". */
export function normalizePhone(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

/**
 * Normalize however a customer types a UAE mobile into E.164 (+9715XXXXXXXX).
 *
 * The +971 country code is fixed in the UI and the customer enters only the
 * national number, but they type it every which way — so this accepts them all:
 *   "50 123 4567" / "501234567"  -> +971501234567   (the national number)
 *   "0501234567"                 -> +971501234567   (local trunk 0 dropped)
 *   "+971501234567" / "971..."   -> +971501234567   (country code they pasted)
 *
 * Returns "" for empty input. It does NOT check length — the caller's schema
 * enforces the final +9715XXXXXXXX shape.
 */
export function toUaeE164(input: string): string {
  let digits = (input ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("971")) digits = digits.slice(3); // pasted country code
  digits = digits.replace(/^0+/, ""); // local trunk 0(s), e.g. 050… -> 50…
  return digits ? `+971${digits}` : "";
}

/**
 * The national part of a UAE mobile for display under the fixed +971 prefix,
 * grouped as "50 123 4567". Accepts E.164, national, or 0-prefixed input; returns
 * "" when empty and the raw national digits when they don't form a full mobile.
 */
export function toUaeNationalDisplay(input: string): string {
  const national = toUaeE164(input).replace(/^\+971/, "");
  const m = national.match(/^(\d{2})(\d{3})(\d{4})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : national;
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
