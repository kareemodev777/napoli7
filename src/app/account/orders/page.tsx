import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { StatusBadge } from "@/components/account/StatusBadge";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your Napoli 7 order history.",
  alternates: { canonical: "/account/orders" },
  robots: { index: false, follow: false },
};

interface OrderRow {
  id: string;
  orderNumber: string;
  totalAed: number;
  status:
    | "received"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  createdAt: string;
  items: { product_name: string; quantity: number }[];
}

async function loadOrders(userId: string): Promise<OrderRow[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_aed, status, created_at, order_items(product_name, quantity)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    totalAed: Number(row.total_aed),
    status: row.status,
    createdAt: row.created_at,
    items: row.order_items ?? [],
  }));
}

export default async function AccountOrdersPage() {
  const user = await requireCustomerAccount("/account/orders");
  const orders = await loadOrders(user.id);

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account/orders" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Orders
            </h1>
            {orders.length === 0 ? (
              <div className="mt-10 border border-border bg-card p-8">
                <p className="text-base">
                  No orders yet. Order your first pizza.
                </p>
                <Link
                  href="/menu"
                  className="mt-4 inline-flex items-center bg-brand text-primary-foreground px-6 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-brand-hover"
                >
                  View menu
                </Link>
              </div>
            ) : (
              <ul className="mt-10 border-t border-border">
                {orders.map((o) => {
                  const summary =
                    o.items.length === 0
                      ? "No items"
                      : `${o.items[0].quantity} × ${o.items[0].product_name}` +
                        (o.items.length > 1
                          ? ` + ${o.items.length - 1} more`
                          : "");
                  return (
                    <li
                      key={o.id}
                      className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_120px] gap-3 md:gap-6 items-baseline py-5 border-b border-border"
                    >
                      <span className="font-display tabular-nums tracking-[0.1em] text-sm">
                        {o.orderNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {summary}
                      </span>
                      <span className="font-display tabular-nums text-sm">
                        {o.totalAed.toFixed(2)} AED
                      </span>
                      <StatusBadge status={o.status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
