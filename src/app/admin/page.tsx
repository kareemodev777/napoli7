import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  ClipboardList,
  Image as ImageIcon,
  Map,
  Pizza,
  TicketPercent,
  type LucideIcon,
} from "lucide-react";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { DashboardDateFilter } from "@/components/admin/DashboardDateFilter";
import { DashboardChart } from "@/components/admin/DashboardChart";
import { loadDashboard, loadLiveSnapshot } from "@/lib/admin/dashboard-data";
import {
  parseDashboardRange,
  type Breakdown,
  type Kpi,
} from "@/lib/admin/dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function money(n: number, fractionDigits = 0): string {
  return n.toLocaleString("en-AE", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "Asia/Dubai",
});

const SMS_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Dubai",
});

interface SmsLogRow {
  id: string;
  phone: string;
  kind: string;
  ok: boolean;
  detail: string | null;
  createdAt: string;
}

/** Recent OTP (Twilio Verify) sends/checks for the dashboard log. */
async function loadSmsLogs(): Promise<SmsLogRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("sms_logs")
    .select("id, phone, kind, ok, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []).map((r) => ({
    id: r.id,
    phone: r.phone,
    kind: r.kind,
    ok: r.ok,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

/** Mask the middle digits of a phone for the log (admin-only, light privacy). */
function maskPhone(phone: string): string {
  if (phone.length <= 8) return phone;
  return `${phone.slice(0, 6)}${"•".repeat(phone.length - 8)}${phone.slice(-2)}`;
}

function DeltaBadge({ kpi }: { kpi: Kpi }) {
  if (kpi.deltaPct === null) {
    return (
      <span className="font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {kpi.value > 0 ? "New" : "—"}
      </span>
    );
  }
  const up = kpi.deltaPct >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-display text-[11px] tabular-nums ${
        up ? "text-flag-green" : "text-flag-red"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      {Math.abs(kpi.deltaPct).toFixed(0)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  kpi,
  comparison,
}: {
  label: string;
  value: string;
  kpi: Kpi;
  comparison: string;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <DeltaBadge kpi={kpi} />
      </div>
      <p className="mt-3 font-display text-3xl leading-none tabular-nums">{value}</p>
      <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">
        {comparison}
      </p>
    </article>
  );
}

// Semantic colours for the order lifecycle: incoming → working → done vs lost.
const STATUS_BAR: Record<string, string> = {
  received: "bg-azure",
  preparing: "bg-brand",
  out_for_delivery: "bg-azure-deep",
  delivered: "bg-flag-green",
  cancelled: "bg-flag-red",
};

function BreakdownCard({
  title,
  rows,
  format,
  barFor,
}: {
  title: string;
  rows: Breakdown[];
  format: (value: number) => string;
  barFor?: (row: Breakdown) => string;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-5">
      <h3 className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span>{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {format(r.value)}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full ${barFor ? barFor(r) : "bg-brand"}`}
                  style={{ width: `${Math.round(r.share * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

const adminActions: {
  href: string;
  title: string;
  icon: LucideIcon;
}[] = [
  { href: "/admin/orders", title: "Live orders", icon: ClipboardList },
  { href: "/admin/catalog", title: "Catalog", icon: Pizza },
  { href: "/admin/site-images", title: "Site images", icon: ImageIcon },
  { href: "/admin/delivery-zones", title: "Delivery zones", icon: Map },
  { href: "/admin/promos", title: "Promotions", icon: TicketPercent },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range = parseDashboardRange(rangeParam);

  const [data, live, smsLogs] = await Promise.all([
    loadDashboard(range),
    loadLiveSnapshot(),
    loadSmsLogs(),
  ]);
  const urgent = live.actionableOrders > 0;
  const today = DATE_FMT.format(new Date());

  return (
    <section className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-[1600px]">
        {/* Header + global date filter. */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-display text-xs uppercase tracking-[0.25em] text-azure-deep">
                Back office
              </p>
              <span className="flex items-center gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-flag-green" />
                <span className="h-1.5 w-1.5 rounded-full border border-border bg-background" />
                <span className="h-1.5 w-1.5 rounded-full bg-flag-red" />
              </span>
            </div>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            <DashboardDateFilter current={range} />
            <Link
              href="/"
              className="inline-flex h-9 items-center rounded-md border border-border px-4 font-display text-xs uppercase tracking-[0.14em] hover:bg-muted"
            >
              Storefront
            </Link>
          </div>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required for live admin metrics.
          </div>
        ) : null}

        {/* Live ops banner — independent of the date filter. */}
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Link
            href="/admin/orders"
            className={`group flex items-center justify-between rounded-md border p-5 transition-colors ${
              urgent
                ? "border-brand bg-brand text-primary-foreground"
                : "border-border bg-card hover:bg-muted/50"
            }`}
          >
            <div>
              <p
                className={`font-display text-[10px] uppercase tracking-[0.22em] ${
                  urgent ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                To treat now
              </p>
              <p className="mt-2 font-display text-3xl leading-none tabular-nums">
                {live.actionableOrders}
              </p>
            </div>
            <ChevronRight
              className={`h-5 w-5 ${urgent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
              strokeWidth={1.7}
              aria-hidden
            />
          </Link>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              In progress
            </p>
            <p className="mt-2 font-display text-3xl leading-none tabular-nums">
              {live.openOrders}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Active promos
            </p>
            <p className="mt-2 font-display text-3xl leading-none tabular-nums">
              {live.activePromos}
            </p>
          </div>
          <div className="rounded-md border border-border bg-card p-5">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Active zones
            </p>
            <p className="mt-2 font-display text-3xl leading-none tabular-nums">
              {live.activeZones}
            </p>
          </div>
        </div>

        {/* KPIs for the selected period, with period-over-period deltas. */}
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Sales"
            value={`${money(data.sales.value, 2)} AED`}
            kpi={data.sales}
            comparison={data.comparisonLabel}
          />
          <KpiCard
            label="Orders"
            value={money(data.orders.value)}
            kpi={data.orders}
            comparison={data.comparisonLabel}
          />
          <KpiCard
            label="Avg order value"
            value={`${money(data.avgOrder.value, 2)} AED`}
            kpi={data.avgOrder}
            comparison={data.comparisonLabel}
          />
          <KpiCard
            label="Items sold"
            value={money(data.itemsSold.value)}
            kpi={data.itemsSold}
            comparison={data.comparisonLabel}
          />
        </div>

        {/* Sales trend — full width. */}
        <div className="mt-4 rounded-md border border-border bg-card p-6">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Sales over {data.rangeLabel}
            </h2>
            <p className="font-display text-sm tabular-nums">
              {money(data.sales.value, 2)}{" "}
              <span className="text-muted-foreground">AED total</span>
            </p>
          </div>
          <DashboardChart buckets={data.buckets} totalRevenue={data.sales.value} />
        </div>

        {/* Breakdowns. */}
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-md border border-border bg-card p-5">
            <h3 className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Top products
            </h3>
            {data.topProducts.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No sales yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.topProducts.map((p) => (
                  <li
                    key={p.name}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-muted-foreground tabular-nums">
                        {p.quantity}×
                      </span>{" "}
                      {p.name}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {money(p.revenue, 0)} AED
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </article>
          <BreakdownCard
            title="Orders by status"
            rows={data.statusBreakdown}
            format={(v) => String(v)}
            barFor={(r) => STATUS_BAR[r.key] ?? "bg-muted-foreground"}
          />
          <BreakdownCard
            title="Sales by payment"
            rows={data.paymentBreakdown}
            format={(v) => `${money(v, 0)} AED`}
          />
          <BreakdownCard
            title="Delivery vs pickup"
            rows={data.deliveryBreakdown}
            format={(v) => String(v)}
          />
        </div>

        {/* Quick actions. */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {adminActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-brand/50 hover:bg-muted/50"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
                </span>
                <span className="font-display text-xs uppercase tracking-[0.12em] group-hover:text-brand">
                  {action.title}
                </span>
              </Link>
            );
          })}
        </div>

        {/* SMS / OTP verification log — sends + errors, newest first. */}
        <div className="mt-8 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            SMS verification log
          </h2>
          {smsLogs.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No verification SMS yet. Sends and any errors will appear here.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Phone</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Result</th>
                    <th className="py-2 pr-4">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {smsLogs.map((l) => (
                    <tr key={l.id} className="border-t border-border align-top">
                      <td className="py-2 pr-4 whitespace-nowrap text-xs text-muted-foreground">
                        {SMS_DATE_FMT.format(new Date(l.createdAt))}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {maskPhone(l.phone)}
                      </td>
                      <td className="py-2 pr-4">
                        {l.kind === "send" ? "Code sent" : "Code check"}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.12em] ${
                            l.ok
                              ? "bg-flag-green/15 text-flag-green"
                              : "bg-flag-red/15 text-flag-red"
                          }`}
                        >
                          {l.ok ? "OK" : "Failed"}
                        </span>
                      </td>
                      <td className="max-w-md py-2 pr-4 text-xs text-muted-foreground">
                        {l.detail ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
