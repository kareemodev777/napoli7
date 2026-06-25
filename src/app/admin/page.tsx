import type { Metadata } from "next";
import Link from "next/link";
import {
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
import { fetchSalesSeries } from "@/lib/admin/sales-data";
import { SalesChart } from "@/components/admin/SalesChart";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
  actionableOrders: number;
  openOrders: number;
  catalogItems: number;
  activePromos: number;
  activeZones: number;
}

async function loadStats(): Promise<DashboardStats> {
  if (!HAS_SUPABASE_SERVICE) {
    return {
      ordersToday: 0,
      revenueToday: 0,
      actionableOrders: 0,
      openOrders: 0,
      catalogItems: 0,
      activePromos: 0,
      activeZones: 0,
    };
  }

  const supabase = createServiceRoleClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, actionableOrders, openOrders, catalogItems, promos, zones] =
    await Promise.all([
      supabase
        .from("orders")
        .select("total_aed", { count: "exact" })
        .gte("created_at", today.toISOString()),
      // Untreated + actionable: received AND (cash on delivery OR already paid).
      // Excludes abandoned, unpaid card checkouts.
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "received")
        .or("payment_method.eq.cod,payment_status.eq.paid"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["received", "preparing", "out_for_delivery"]),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("promo_codes")
        .select("code", { count: "exact", head: true })
        .eq("active", true),
      supabase
        .from("delivery_zones")
        .select("area", { count: "exact", head: true })
        .eq("active", true),
    ]);

  return {
    ordersToday: todayOrders.count ?? 0,
    revenueToday: (todayOrders.data ?? []).reduce(
      (sum, row) => sum + Number(row.total_aed ?? 0),
      0,
    ),
    actionableOrders: actionableOrders.count ?? 0,
    openOrders: openOrders.count ?? 0,
    catalogItems: catalogItems.count ?? 0,
    activePromos: promos.count ?? 0,
    activeZones: zones.count ?? 0,
  };
}

/** Quiet reference figure — a label over a number, used for non-urgent counts. */
function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <article className="rounded-md border border-border bg-card p-5">
      <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>
      ) : null}
    </article>
  );
}

const adminActions: {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/admin/orders",
    title: "Manage live orders",
    body: "View the kitchen queue, call customers, and update order status.",
    icon: ClipboardList,
  },
  {
    href: "/admin/catalog",
    title: "Edit catalog",
    body: "Add categories, menu items, pricing, images, and customization options.",
    icon: Pizza,
  },
  {
    href: "/admin/site-images",
    title: "Site images",
    body: "Replace the hero banner and marketing photos on the home and about pages.",
    icon: ImageIcon,
  },
  {
    href: "/admin/delivery-zones",
    title: "Control delivery zones",
    body: "Set visible Ajman areas, delivery fees, and checkout ordering.",
    icon: Map,
  },
  {
    href: "/admin/promos",
    title: "Run promotions",
    body: "Create and edit discount codes, expiry windows, and usage limits.",
    icon: TicketPercent,
  },
];

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  timeZone: "Asia/Dubai",
});

export default async function AdminPage() {
  const [stats, salesSeries] = await Promise.all([
    loadStats(),
    fetchSalesSeries("week"),
  ]);
  const urgent = stats.actionableOrders > 0;
  const today = DATE_FMT.format(new Date());

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
              Admin dashboard
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{today}</p>
          </div>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-border px-4 font-display text-xs uppercase tracking-[0.14em] hover:bg-muted"
          >
            View storefront
          </Link>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required for live admin metrics and
            management actions.
          </div>
        ) : null}

        {/* Live status — the kitchen's at-a-glance state, hero first. */}
        <h2 className="mt-8 font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Live status
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 xl:grid-cols-12">
          {/* Hero: orders to treat. Fills navy when there's work to do. */}
          <article
            className={`col-span-2 flex flex-col rounded-md border p-6 xl:col-span-5 ${
              urgent
                ? "border-brand bg-brand text-primary-foreground"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`font-display text-[10px] uppercase tracking-[0.22em] ${
                  urgent ? "text-primary-foreground/80" : "text-muted-foreground"
                }`}
              >
                Orders to treat
              </p>
              <ClipboardList
                className={`h-4 w-4 ${urgent ? "text-primary-foreground/80" : "text-muted-foreground"}`}
                strokeWidth={1.7}
                aria-hidden
              />
            </div>
            <p className="mt-4 font-display text-5xl leading-none tabular-nums">
              {stats.actionableOrders}
            </p>
            <p
              className={`mt-2 text-sm ${
                urgent ? "text-primary-foreground/80" : "text-muted-foreground"
              }`}
            >
              {urgent
                ? "Paid or cash orders waiting in the kitchen queue."
                : "All caught up — nothing waiting right now."}
            </p>
            <Link
              href="/admin/orders"
              className={`mt-5 inline-flex items-center gap-1 self-start font-display text-xs uppercase tracking-[0.14em] ${
                urgent
                  ? "text-primary-foreground hover:opacity-80"
                  : "text-brand hover:text-brand-hover"
              }`}
            >
              Open kitchen queue
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </Link>
          </article>

          {/* Today: revenue is the headline figure, order count beneath it. */}
          <article className="col-span-2 flex flex-col rounded-md border border-border bg-card p-6 xl:col-span-4">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Revenue today
            </p>
            <p className="mt-4 font-display text-4xl leading-none tabular-nums">
              {stats.revenueToday.toFixed(2)}
              <span className="ml-1.5 text-base text-muted-foreground">AED</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Across {stats.ordersToday} order
              {stats.ordersToday === 1 ? "" : "s"} placed today.
            </p>
          </article>

          <article className="col-span-1 flex flex-col rounded-md border border-border bg-card p-6 xl:col-span-3">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              In progress
            </p>
            <p className="mt-4 font-display text-4xl leading-none tabular-nums">
              {stats.openOrders}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Received, preparing, or out for delivery.
            </p>
          </article>
        </div>

        {/* Sales — full-width trend with a week/month/year filter. */}
        <h2 className="mt-10 font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Sales trend
        </h2>
        <div className="mt-3">
          <SalesChart initial={salesSeries} />
        </div>

        {/* Catalog & setup — static config, deliberately quieter. */}
        <h2 className="mt-10 font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Catalog &amp; setup
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label="Catalog items" value={stats.catalogItems} />
          <StatTile label="Active promos" value={stats.activePromos} />
          <StatTile label="Active zones" value={stats.activeZones} />
        </div>

        {/* Quick actions — icon-led, matching the sidebar. */}
        <h2 className="mt-10 font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          Quick actions
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {adminActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-start gap-4 rounded-md border border-border bg-card p-5 transition-colors hover:border-brand/50 hover:bg-muted/50"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-display text-sm uppercase tracking-[0.14em] group-hover:text-brand">
                    {action.title}
                    <ChevronRight
                      className="h-3.5 w-3.5 shrink-0 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
                    {action.body}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
