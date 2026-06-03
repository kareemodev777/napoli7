import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { StatusBadge } from "@/components/account/StatusBadge";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Napoli 7 account dashboard.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: false },
};

interface RecentOrder {
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
}

async function loadRecentOrders(userId: string): Promise<RecentOrder[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, total_aed, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    totalAed: Number(row.total_aed),
    status: row.status,
    createdAt: row.created_at,
  }));
}

export default async function AccountPage() {
  const user = await requireCustomerAccount("/account");
  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";
  const recent = await loadRecentOrders(user.id);

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account" />
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
              Account
            </p>
            <h1 className="font-display text-3xl md:text-4xl leading-tight">
              Hello, {firstName}.
            </h1>

            <section className="mt-12">
              <h2 className="font-display text-xs tracking-[0.25em] uppercase mb-4">
                Recent orders
              </h2>
              {recent.length === 0 ? (
                <div className="border border-border bg-card p-8">
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
                <ul className="border-t border-border">
                  {recent.map((o) => (
                    <li
                      key={o.id}
                      className="grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center py-4 border-b border-border"
                    >
                      <span className="font-display tabular-nums tracking-[0.1em] text-sm">
                        {o.orderNumber}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(o.createdAt).toLocaleString("en-AE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span className="font-display tabular-nums text-sm">
                        {o.totalAed.toFixed(2)} AED
                      </span>
                      <StatusBadge status={o.status} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
