/**
 * Sales time-series for the admin dashboard. Pure and unit-tested: given raw
 * orders it buckets confirmed revenue by day (week / month ranges) or by month
 * (year range), anchored to the shop's timezone (Asia/Dubai) so a "day" matches
 * what the kitchen actually worked.
 *
 * "Revenue" counts real sales only — cash-on-delivery or already-paid orders,
 * never cancelled or abandoned card checkouts.
 */

export type SalesRange = "week" | "month" | "year";

export interface SalesOrder {
  created_at: string;
  total_aed: number | string | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
}

export interface SalesBucket {
  /** Stable bucket id: `YYYY-MM-DD` (daily) or `YYYY-MM` (monthly). */
  key: string;
  /** Compact axis label, e.g. "Mon", "26", "Jun". */
  label: string;
  /** Full label for tooltips, e.g. "26 Jun", "Jun 2026". */
  labelFull: string;
  revenue: number;
  orders: number;
}

export interface SalesSeries {
  range: SalesRange;
  buckets: SalesBucket[];
  totalRevenue: number;
  totalOrders: number;
}

export const SALES_RANGES: { value: SalesRange; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export function parseSalesRange(value: string | null | undefined): SalesRange {
  return value === "month" || value === "year" ? value : "week";
}

const DAY_MS = 86_400_000;
const TZ = "Asia/Dubai";
const pad = (n: number) => String(n).padStart(2, "0");

const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short", year: "numeric" });

function dubaiYMD(date: Date): { y: number; m: number; d: number } {
  const [y, m, d] = YMD.format(date).split("-").map(Number);
  return { y, m, d };
}

function bucketKey(date: Date, range: SalesRange): string {
  const { y, m, d } = dubaiYMD(date);
  return range === "year" ? `${y}-${pad(m)}` : `${y}-${pad(m)}-${pad(d)}`;
}

function isSale(order: SalesOrder): boolean {
  if (order.status === "cancelled") return false;
  return order.payment_method === "cod" || order.payment_status === "paid";
}

/** Earliest order time worth fetching to fill the buckets for a range. */
export function salesWindowStart(range: SalesRange, now: Date): Date {
  const days = range === "year" ? 366 : range === "month" ? 31 : 7;
  return new Date(now.getTime() - days * DAY_MS);
}

function makeBuckets(range: SalesRange, now: Date): SalesBucket[] {
  if (range === "year") {
    const { y, m } = dubaiYMD(now);
    const out: SalesBucket[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      let yy = y;
      let mm = m - i;
      while (mm <= 0) {
        mm += 12;
        yy -= 1;
      }
      // A mid-month UTC instant formats to the right month in Dubai.
      const at = new Date(Date.UTC(yy, mm - 1, 15, 8, 0, 0));
      out.push({
        key: `${yy}-${pad(mm)}`,
        label: MONTH.format(at),
        labelFull: MONTH_YEAR.format(at),
        revenue: 0,
        orders: 0,
      });
    }
    return out;
  }

  const count = range === "month" ? 30 : 7;
  const out: SalesBucket[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    // Dubai has no DST, so stepping a fixed 24h lands on the previous local day.
    const at = new Date(now.getTime() - i * DAY_MS);
    const { y, m, d } = dubaiYMD(at);
    out.push({
      key: `${y}-${pad(m)}-${pad(d)}`,
      label: range === "week" ? WEEKDAY.format(at) : String(d),
      labelFull: DAY_MONTH.format(at),
      revenue: 0,
      orders: 0,
    });
  }
  return out;
}

export function buildSalesSeries(
  orders: SalesOrder[],
  range: SalesRange,
  now: Date,
): SalesSeries {
  const buckets = makeBuckets(range, now);
  const index = new Map(buckets.map((b, i) => [b.key, i]));

  for (const order of orders) {
    if (!isSale(order)) continue;
    const i = index.get(bucketKey(new Date(order.created_at), range));
    if (i === undefined) continue;
    const amount = Number(order.total_aed ?? 0);
    buckets[i].revenue += Number.isFinite(amount) ? amount : 0;
    buckets[i].orders += 1;
  }

  return {
    range,
    buckets,
    totalRevenue: buckets.reduce((s, b) => s + b.revenue, 0),
    totalOrders: buckets.reduce((s, b) => s + b.orders, 0),
  };
}
