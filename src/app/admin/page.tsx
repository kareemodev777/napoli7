import type { Metadata } from "next";
import Link from "next/link";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface DashboardStats {
  ordersToday: number;
  revenueToday: number;
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
      openOrders: 0,
      catalogItems: 0,
      activePromos: 0,
      activeZones: 0,
    };
  }

  const supabase = createServiceRoleClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayOrders, openOrders, catalogItems, promos, zones] = await Promise.all([
    supabase
      .from("orders")
      .select("total_aed", { count: "exact" })
      .gte("created_at", today.toISOString()),
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
    openOrders: openOrders.count ?? 0,
    catalogItems: catalogItems.count ?? 0,
    activePromos: promos.count ?? 0,
    activeZones: zones.count ?? 0,
  };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-md border border-border bg-card p-6">
      <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-display text-3xl tabular-nums">{value}</p>
    </article>
  );
}

const adminActions = [
  {
    href: "/admin/orders",
    title: "Manage live orders",
    body: "View the kitchen queue, call customers, and update order status.",
  },
  {
    href: "/admin/catalog",
    title: "Edit catalog",
    body: "Add categories, menu items, pricing, images, and customization options.",
  },
  {
    href: "/admin/delivery-zones",
    title: "Control delivery zones",
    body: "Set visible Ajman areas, delivery fees, and checkout ordering.",
  },
  {
    href: "/admin/promos",
    title: "Run promotions",
    body: "Create and edit discount codes, expiry windows, and usage limits.",
  },
];

export default async function AdminPage() {
  const stats = await loadStats();

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-azure-deep">
              Back office
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Admin dashboard
            </h1>
            <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
              This is the administration area for operating Napoli 7. Customer
              account navigation is intentionally not shown here.
            </p>
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
            Supabase service environment is required for live admin metrics and management actions.
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Orders today" value={stats.ordersToday} />
          <StatCard label="Revenue today" value={`${stats.revenueToday.toFixed(2)} AED`} />
          <StatCard label="Open orders" value={stats.openOrders} />
          <StatCard label="Catalog items" value={stats.catalogItems} />
          <StatCard label="Active promos" value={stats.activePromos} />
          <StatCard label="Active zones" value={stats.activeZones} />
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {adminActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-md border border-border bg-card p-6 transition-colors hover:border-brand/50 hover:bg-muted/50"
            >
              <h2 className="font-display text-sm uppercase tracking-[0.18em] group-hover:text-brand">
                {action.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {action.body}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
