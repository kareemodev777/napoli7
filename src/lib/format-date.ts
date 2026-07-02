/**
 * Centralised date/time display formatting.
 *
 * Every user-facing timestamp (admin panel + storefront) is rendered in the
 * shop's timezone so staff and customers always see the shop's local time,
 * regardless of the browser/server timezone they happen to be in.
 *
 * This mirrors `ORDERING_TIME_ZONE` in `@/lib/ordering-hours`, but is kept as a
 * standalone constant so this module can be imported into client components
 * without pulling the Supabase SDK into the client bundle.
 */
export const DISPLAY_TIME_ZONE = "Asia/Dubai";

type DateInput = Date | string | number;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Format a date + time in the shop timezone. */
export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
  locale = "en-AE",
): string {
  return toDate(value).toLocaleString(locale, {
    ...options,
    timeZone: DISPLAY_TIME_ZONE,
  });
}

/** Format a date only (no time) in the shop timezone. */
export function formatDate(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = {},
  locale = "en-AE",
): string {
  return toDate(value).toLocaleDateString(locale, {
    ...options,
    timeZone: DISPLAY_TIME_ZONE,
  });
}
