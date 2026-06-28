import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { StatusBadge } from "@/components/account/StatusBadge";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HAS_SUPABASE, HAS_SUPABASE_SERVICE } from "@/lib/env";

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

interface CustomerReward {
  code: string;
  discountAed: number;
  /** True while the code is still active and unredeemed. */
  available: boolean;
}

/**
 * The signed-in customer's launch free-pizza reward, if they claimed one — so
 * they can find the code in their account instead of digging through email.
 * Read via the service role (free_pizza_claims isn't exposed to the customer
 * client), scoped strictly to their own user id.
 */
async function loadReward(userId: string): Promise<CustomerReward | null> {
  if (!HAS_SUPABASE_SERVICE) return null;
  const supabase = createServiceRoleClient();
  const { data: claim } = await supabase
    .from("free_pizza_claims")
    .select("code")
    .eq("user_id", userId)
    .maybeSingle();
  if (!claim) return null;

  const { data: promo } = await supabase
    .from("promo_codes")
    .select("discount_aed, max_uses, times_used, active")
    .eq("code", claim.code)
    .maybeSingle();
  if (!promo) return null;

  const used =
    promo.max_uses != null && Number(promo.times_used) >= Number(promo.max_uses);
  return {
    code: claim.code,
    discountAed: Number(promo.discount_aed ?? 0),
    available: Boolean(promo.active) && !used,
  };
}

export default async function AccountPage() {
  const user = await requireCustomerAccount("/account");
  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";
  const [recent, reward] = await Promise.all([
    loadRecentOrders(user.id),
    loadReward(user.id),
  ]);

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

            {reward ? (
              <section className="mt-10">
                {reward.available ? (
                  <div className="rounded-md border border-brand/40 bg-brand/5 p-6">
                    <p className="font-display text-xs uppercase tracking-[0.24em] text-brand">
                      Your reward
                    </p>
                    <p className="mt-2 text-base text-foreground">
                      Free pizza — {reward.discountAed.toFixed(0)} AED off your
                      order.
                    </p>
                    <p className="mt-3 font-mono text-2xl tracking-[0.12em] text-foreground">
                      {reward.code}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Apply this code at checkout while signed in. It works once
                      and is tied to your account.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border border-border bg-card p-6">
                    <p className="font-display text-xs uppercase tracking-[0.24em] text-muted-foreground">
                      Your reward
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      You&rsquo;ve used your free-pizza reward. Buon appetito! 🍕
                    </p>
                  </div>
                )}
              </section>
            ) : null}

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
