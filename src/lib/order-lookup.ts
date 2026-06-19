const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Customers track orders by their human-readable `order_number` (e.g.
 * "N7-00016"), but the internal share link uses the row `id` (a uuid). A naive
 * `.or(id.eq.<input>, order_number.ilike.<input>)` blows up the WHOLE query with
 * `invalid input syntax for type uuid` whenever the input is NOT a uuid — which
 * is the common case — silently returning "no order found". So only compare
 * against the uuid `id` column when the input is actually shaped like a uuid.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
