/**
 * A stand-in address for customers who sign up with a phone and no email.
 *
 * Email is optional at registration, but Supabase Auth still needs an identity to
 * hang the account on, and `orders.customer_email` is NOT NULL. Rather than
 * loosen either — both are load-bearing — a customer with no email gets a
 * placeholder derived from their mobile, which is stable, unique, and obviously
 * not a real inbox.
 *
 * It uses the reserved `.invalid` TLD (RFC 2606), which is guaranteed never to
 * resolve. That is the point: if one of these ever reaches a mail provider it
 * bounces immediately rather than silently going nowhere, and a stray send is a
 * loud bug instead of a customer wondering why they hear nothing. Every email
 * path checks `isPlaceholderEmail` before sending.
 */
const PLACEHOLDER_DOMAIN = "phone.napoli7.invalid";

/** The placeholder address for a UAE mobile, e.g. +971509833501. */
export function placeholderEmailForPhone(mobile: string): string {
  const digits = (mobile ?? "").replace(/\D/g, "");
  return `p${digits}@${PLACEHOLDER_DOMAIN}`;
}

/** Whether an address is a stand-in, and so must never be mailed. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${PLACEHOLDER_DOMAIN}`));
}

/** The address to show a customer in a form: a placeholder shows as blank. */
export function displayEmail(email: string | null | undefined): string {
  return isPlaceholderEmail(email) ? "" : (email ?? "");
}
