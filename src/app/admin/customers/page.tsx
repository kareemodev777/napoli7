import type { Metadata } from "next";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  deriveCustomers,
  type DerivedCustomer,
  type OrderForCustomer,
} from "@/lib/admin/customers";

export const metadata: Metadata = {
  title: "Customers · Admin",
  alternates: { canonical: "/admin/customers" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadCustomers(): Promise<DerivedCustomer[]> {
  if (!HAS_SUPABASE_SERVICE) return [];

  const supabase = createServiceRoleClient();
  // Cap the scan — derivation is in-memory. Newest orders dominate the list.
  const { data } = await supabase
    .from("orders")
    .select("customer_name, customer_email, customer_phone, total_aed, created_at")
    .order("created_at", { ascending: false })
    .limit(2000);

  return deriveCustomers((data ?? []) as OrderForCustomer[]);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminCustomersPage() {
  const customers = await loadCustomers();

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Customers
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Derived from order history by email (or phone). Showing each
              customer&apos;s order count, spend, and most recent order.
            </p>
          </div>
          <span className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
            {customers.length} customer{customers.length === 1 ? "" : "s"}
          </span>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to list customers.
          </div>
        ) : customers.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No customers yet. They appear here once orders are placed.
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium text-right">Orders</th>
                  <th className="px-4 py-3 font-medium text-right">Total spent</th>
                  <th className="px-4 py-3 font-medium">Last order</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr
                    key={customer.key}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium">{customer.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {customer.email ? (
                        <a
                          href={`mailto:${customer.email}`}
                          className="block hover:text-foreground"
                        >
                          {customer.email}
                        </a>
                      ) : null}
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="block text-xs hover:text-foreground"
                        >
                          {customer.phone}
                        </a>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {customer.orderCount}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {customer.totalSpentAed.toFixed(2)} AED
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(customer.lastOrderAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
