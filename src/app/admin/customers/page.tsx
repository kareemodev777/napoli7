import type { Metadata } from "next";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { CustomersTable } from "@/components/admin/CustomersTable";
import {
  deriveCustomers,
  normalizeEmail,
  type DerivedCustomer,
  type OrderForCustomer,
} from "@/lib/admin/customers";

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

export const metadata: Metadata = {
  title: "Customers · Admin",
  alternates: { canonical: "/admin/customers" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Emails that have an actual auth account, used to flag registered vs guest. */
async function loadRegisteredEmails(
  supabase: ServiceClient,
): Promise<Set<string>> {
  const emails = new Set<string>();
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error || !data.users.length) break;
    for (const user of data.users) {
      const email = normalizeEmail(user.email);
      if (email) emails.add(email);
    }
    if (data.users.length < perPage) break;
  }
  return emails;
}

async function loadCustomers(): Promise<DerivedCustomer[]> {
  if (!HAS_SUPABASE_SERVICE) return [];

  const supabase = createServiceRoleClient();
  // Cap the scan — derivation is in-memory. Newest orders dominate the list.
  const [{ data }, registeredEmails] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, user_id, customer_name, customer_email, customer_phone, total_aed, status, payment_method, payment_status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(2000),
    loadRegisteredEmails(supabase),
  ]);

  return deriveCustomers((data ?? []) as OrderForCustomer[], registeredEmails);
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
              Derived live from order history by email (or phone). Each row shows
              account vs guest, order count, spend, and the latest order — click
              to expand the full order list.
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
          <CustomersTable customers={customers} />
        )}
      </div>
    </section>
  );
}
