/**
 * Lenient UUID-format check: any 8-4-4-4-12 hex string.
 *
 * Postgres' `uuid` type (and our client cart) accept ANY such string, but some
 * seeded catalog ids are not RFC-4122 versioned — e.g. drinks use placeholder
 * ids like `44444444-0000-0000-0000-000000000001`. Zod v4's `.uuid()` is strict
 * RFC-9562 and REJECTS those (the version/variant nibbles are `0`), which made
 * checkout fail with "your cart is out of date" for any cart containing a drink.
 *
 * Use this for any value that is a stored DB uuid (product ids especially),
 * rather than `z.string().uuid()`, so validation is never stricter than storage.
 * It still rejects genuinely stale non-uuid ids (e.g. demo slugs).
 */
export const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
