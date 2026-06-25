/**
 * Dashboard metrics for the admin home. Pure and unit-tested: given orders
 * spanning the current and previous comparison window, it produces KPIs with
 * period-over-period deltas, a revenue time-series, and breakdowns by status,
 * payment method, delivery type, and product.
 *
 * Everything is anchored to the shop's timezone (Asia/Dubai, a fixed +04:00 with
 * no DST) so a "day" matches the shift the kitchen actually worked. Revenue
 * counts real sales only — cash-on-delivery or already-paid, never cancelled or
 * abandoned card checkouts.
 */

export type DashboardRange = "today" | "7d" | "30d" | "90d" | "12mo";

export interface DashboardOrder {
  created_at: string;
  total_aed: number | string | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  delivery_type: string | null;
  order_items?:
    | {
        product_name: string | null;
        quantity: number | null;
        line_total_aed: number | string | null;
      }[]
    | null;
}

export interface Kpi {
  value: number;
  prev: number;
  /** Percent change vs the previous period; null when there's no prior baseline. */
  deltaPct: number | null;
}

export interface DashBucket {
  key: string;
  label: string;
  labelFull: string;
  revenue: number;
  orders: number;
}

export interface Breakdown {
  key: string;
  label: string;
  value: number;
  share: number;
}

export interface DashboardData {
  range: DashboardRange;
  rangeLabel: string;
  comparisonLabel: string;
  granularity: "hour" | "day" | "month";
  sales: Kpi;
  orders: Kpi;
  avgOrder: Kpi;
  itemsSold: Kpi;
  buckets: DashBucket[];
  statusBreakdown: Breakdown[];
  paymentBreakdown: Breakdown[];
  deliveryBreakdown: Breakdown[];
  topProducts: { name: string; quantity: number; revenue: number }[];
}

export const DASHBOARD_RANGES: {
  value: DashboardRange;
  label: string;
  short: string;
}[] = [
  { value: "today", label: "Today", short: "Today" },
  { value: "7d", label: "Last 7 days", short: "7 days" },
  { value: "30d", label: "Last 30 days", short: "30 days" },
  { value: "90d", label: "Last 90 days", short: "90 days" },
  { value: "12mo", label: "Last 12 months", short: "12 months" },
];

export function parseDashboardRange(value: string | null | undefined): DashboardRange {
  const found = DASHBOARD_RANGES.find((r) => r.value === value);
  return found ? found.value : "30d";
}

const TZ = "Asia/Dubai";
const DUBAI_OFFSET_MS = 4 * 3_600_000;
const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short" });
const MONTH = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" });
const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short", year: "numeric" });

function dubai(date: Date): { y: number; m: number; d: number; h: number } {
  const parts = PARTS.formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour") };
}

/** UTC instant of Dubai-local midnight for a given Dubai calendar date. */
function dayStartUtc(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) - DUBAI_OFFSET_MS;
}

function granularityOf(range: DashboardRange): "hour" | "day" | "month" {
  if (range === "today") return "hour";
  if (range === "12mo") return "month";
  return "day";
}

function keyOf(date: Date, granularity: "hour" | "day" | "month"): string {
  const p = dubai(date);
  if (granularity === "hour") return `${p.y}-${pad(p.m)}-${pad(p.d)}T${pad(p.h)}`;
  if (granularity === "month") return `${p.y}-${pad(p.m)}`;
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

interface Window {
  currentStart: number;
  prevStart: number;
  granularity: "hour" | "day" | "month";
  buckets: DashBucket[];
}

function buildWindow(range: DashboardRange, now: Date): Window {
  const granularity = granularityOf(range);
  const t = dubai(now);
  const todayStart = dayStartUtc(t.y, t.m, t.d);
  const buckets: DashBucket[] = [];

  if (granularity === "hour") {
    for (let h = 0; h < 24; h += 1) {
      buckets.push({
        key: `${t.y}-${pad(t.m)}-${pad(t.d)}T${pad(h)}`,
        label: pad(h),
        labelFull: `${pad(h)}:00`,
        revenue: 0,
        orders: 0,
      });
    }
    return { currentStart: todayStart, prevStart: todayStart - DAY_MS, granularity, buckets };
  }

  if (granularity === "month") {
    const out: DashBucket[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      let yy = t.y;
      let mm = t.m - i;
      while (mm <= 0) {
        mm += 12;
        yy -= 1;
      }
      const at = new Date(Date.UTC(yy, mm - 1, 15, 8, 0, 0));
      out.push({
        key: `${yy}-${pad(mm)}`,
        label: MONTH.format(at),
        labelFull: MONTH_YEAR.format(at),
        revenue: 0,
        orders: 0,
      });
    }
    const first = out[0].key.split("-").map(Number);
    const currentStart = dayStartUtc(first[0], first[1], 1);
    // Previous period = the 12 months before the first bucket.
    let py = first[0] - 1;
    const prevStart = dayStartUtc(py, first[1], 1);
    void py;
    return { currentStart, prevStart, granularity, buckets: out };
  }

  const spanDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  for (let i = spanDays - 1; i >= 0; i -= 1) {
    const at = new Date(now.getTime() - i * DAY_MS);
    const p = dubai(at);
    buckets.push({
      key: `${p.y}-${pad(p.m)}-${pad(p.d)}`,
      label: range === "7d" ? WEEKDAY.format(at) : String(p.d),
      labelFull: DAY_MONTH.format(at),
      revenue: 0,
      orders: 0,
    });
  }
  const currentStart = todayStart - (spanDays - 1) * DAY_MS;
  return { currentStart, prevStart: currentStart - spanDays * DAY_MS, granularity, buckets };
}

function isSale(o: DashboardOrder): boolean {
  if (o.status === "cancelled") return false;
  return o.payment_method === "cod" || o.payment_status === "paid";
}

function num(v: number | string | null | undefined): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function deltaPct(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function toBreakdown(
  counts: Map<string, number>,
  labels: Record<string, string>,
): Breakdown[] {
  const total = [...counts.values()].reduce((s, v) => s + v, 0);
  return [...counts.entries()]
    .map(([key, value]) => ({
      key,
      label: labels[key] ?? key,
      value,
      share: total > 0 ? value / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

const STATUS_LABELS: Record<string, string> = {
  received: "Received",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const RANGE_LABELS: Record<DashboardRange, string> = {
  today: "today",
  "7d": "last 7 days",
  "30d": "last 30 days",
  "90d": "last 90 days",
  "12mo": "last 12 months",
};

const COMPARISON_LABELS: Record<DashboardRange, string> = {
  today: "vs yesterday",
  "7d": "vs previous 7 days",
  "30d": "vs previous 30 days",
  "90d": "vs previous 90 days",
  "12mo": "vs previous 12 months",
};

export function buildDashboard(
  orders: DashboardOrder[],
  range: DashboardRange,
  now: Date,
): DashboardData {
  const win = buildWindow(range, now);
  const index = new Map(win.buckets.map((b, i) => [b.key, i]));

  let curSales = 0;
  let prevSales = 0;
  let curOrders = 0;
  let prevOrders = 0;
  let curItems = 0;
  let prevItems = 0;

  const statusCounts = new Map<string, number>();
  const paymentRevenue = new Map<string, number>();
  const deliveryCounts = new Map<string, number>();
  const productAgg = new Map<string, { quantity: number; revenue: number }>();

  for (const order of orders) {
    const createdMs = Date.parse(order.created_at);
    if (Number.isNaN(createdMs) || createdMs < win.prevStart) continue;
    const isCurrent = createdMs >= win.currentStart;
    const sale = isSale(order);
    const total = num(order.total_aed);
    const items = order.order_items ?? [];
    const itemQty = items.reduce((s, it) => s + num(it.quantity), 0);

    if (sale) {
      if (isCurrent) {
        curSales += total;
        curOrders += 1;
        curItems += itemQty;
      } else {
        prevSales += total;
        prevOrders += 1;
        prevItems += itemQty;
      }
    }

    if (!isCurrent) continue;

    // Status breakdown counts every order in the period (ops view).
    const status = order.status ?? "unknown";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (!sale) continue;

    const method = order.payment_method === "cod" ? "cod" : "card";
    paymentRevenue.set(method, (paymentRevenue.get(method) ?? 0) + total);

    const delivery = order.delivery_type ?? "unknown";
    deliveryCounts.set(delivery, (deliveryCounts.get(delivery) ?? 0) + 1);

    const i = index.get(keyOf(new Date(createdMs), win.granularity));
    if (i !== undefined) {
      win.buckets[i].revenue += total;
      win.buckets[i].orders += 1;
    }

    for (const it of items) {
      const name = (it.product_name ?? "").trim() || "Unnamed item";
      const agg = productAgg.get(name) ?? { quantity: 0, revenue: 0 };
      agg.quantity += num(it.quantity);
      agg.revenue += num(it.line_total_aed);
      productAgg.set(name, agg);
    }
  }

  const avgCur = curOrders > 0 ? curSales / curOrders : 0;
  const avgPrev = prevOrders > 0 ? prevSales / prevOrders : 0;

  const topProducts = [...productAgg.entries()]
    .map(([name, v]) => ({ name, quantity: v.quantity, revenue: v.revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    range,
    rangeLabel: RANGE_LABELS[range],
    comparisonLabel: COMPARISON_LABELS[range],
    granularity: win.granularity,
    sales: { value: curSales, prev: prevSales, deltaPct: deltaPct(curSales, prevSales) },
    orders: { value: curOrders, prev: prevOrders, deltaPct: deltaPct(curOrders, prevOrders) },
    avgOrder: { value: avgCur, prev: avgPrev, deltaPct: deltaPct(avgCur, avgPrev) },
    itemsSold: { value: curItems, prev: prevItems, deltaPct: deltaPct(curItems, prevItems) },
    buckets: win.buckets,
    statusBreakdown: toBreakdown(statusCounts, STATUS_LABELS),
    paymentBreakdown: toBreakdown(paymentRevenue, { cod: "Cash on delivery", card: "Card" }),
    deliveryBreakdown: toBreakdown(deliveryCounts, { delivery: "Delivery", pickup: "Pickup" }),
    topProducts,
  };
}

/** Earliest order timestamp worth fetching to fill current + previous periods. */
export function dashboardFetchStart(range: DashboardRange, now: Date): Date {
  return new Date(buildWindow(range, now).prevStart);
}
