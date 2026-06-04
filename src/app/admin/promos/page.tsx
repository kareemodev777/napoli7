import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { DeletePromoButton } from "./DeletePromoButton";
import { Badge, PromoForm, money } from "./form-components";
import type { PromoCodeRow } from "./types";
import { AdminModal } from "@/components/admin/AdminModal";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Promos · Admin",
  alternates: { canonical: "/admin/promos" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadPromos(): Promise<PromoCodeRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (data ?? []) as PromoCodeRow[];
}

/**
 * Count orders that actually used each code. `times_used` tracks redemptions
 * (now COD-immediate, card-on-payment); this is the number of orders carrying
 * the code, which is the figure an operator wants to reconcile against.
 */
async function loadOrderCounts(
  codes: string[],
): Promise<Record<string, number>> {
  if (!HAS_SUPABASE_SERVICE || codes.length === 0) return {};

  const supabase = createServiceRoleClient();
  const entries = await Promise.all(
    codes.map(async (code) => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("promo_code", code);
      return [code, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(entries);
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted">
      <span className="sr-only">{label}</span>
      {children}
    </span>
  );
}

function AddPromoModal() {
  return (
    <AdminModal
      title="Add promo code"
      description="Create a discount code customers can apply in the cart."
      triggerLabel="Add promo code"
      triggerClassName="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
      maxWidthClassName="max-w-2xl"
      trigger={<><Plus className="h-4 w-4" strokeWidth={1.7} />Promo</>}
    >
      <PromoForm />
    </AdminModal>
  );
}

function EditPromoModal({ promo }: { promo: PromoCodeRow }) {
  return (
    <AdminModal
      title="Edit promo code"
      description="Adjust discount amount, validity window, usage cap, or checkout visibility."
      triggerLabel={`Edit ${promo.code}`}
      triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-md"
      maxWidthClassName="max-w-2xl"
      trigger={<IconButton label="Edit promo"><Pencil className="h-4 w-4" strokeWidth={1.7} /></IconButton>}
    >
      <PromoForm promo={promo} />
    </AdminModal>
  );
}

function formatDiscount(promo: PromoCodeRow) {
  if (promo.discount_pct != null) return `${Number(promo.discount_pct)}%`;
  return `${money(promo.discount_aed)} AED`;
}

function usageLabel(promo: PromoCodeRow) {
  if (promo.max_uses == null) return `${promo.times_used} used`;
  return `${promo.times_used} / ${promo.max_uses} used`;
}

function windowLabel(promo: PromoCodeRow) {
  if (!promo.valid_from && !promo.valid_until) return "Always valid";
  const from = promo.valid_from
    ? new Date(promo.valid_from).toLocaleDateString("en-AE")
    : "now";
  const until = promo.valid_until
    ? new Date(promo.valid_until).toLocaleDateString("en-AE")
    : "no expiry";
  return `${from} → ${until}`;
}

export default async function AdminPromosPage() {
  const promos = await loadPromos();
  const orderCounts = await loadOrderCounts(promos.map((promo) => promo.code));
  const activeCount = promos.filter((promo) => promo.active).length;
  const cappedCount = promos.filter(
    (promo) => promo.max_uses != null && promo.times_used >= promo.max_uses,
  ).length;

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Promo Codes
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Manage cart discounts, launch offers, usage limits, and expiry windows.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{promos.length} codes</Badge>
            <Badge tone="active">{activeCount} active</Badge>
            {cappedCount ? (
              <Badge tone="warning">{cappedCount} capped</Badge>
            ) : null}
            <AddPromoModal />
          </div>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to manage promo codes.
            Set the Supabase URL and service role key to enable this page.
          </div>
        ) : promos.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No promo codes yet. Use Add promo to create the first discount code.
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Discount</th>
                  <th className="px-4 py-3 font-medium">Minimum</th>
                  <th className="px-4 py-3 font-medium">Usage</th>
                  <th className="px-4 py-3 font-medium">Window</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => (
                  <tr
                    key={promo.code}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-display uppercase tracking-[0.08em]">
                      {promo.code}
                    </td>
                    <td className="px-4 py-3">{formatDiscount(promo)}</td>
                    <td className="px-4 py-3">
                      {money(promo.min_subtotal_aed)} AED
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{usageLabel(promo)}</div>
                      <div className="text-xs text-muted-foreground/70">
                        {orderCounts[promo.code] ?? 0} order
                        {(orderCounts[promo.code] ?? 0) === 1 ? "" : "s"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {windowLabel(promo)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={promo.active ? "active" : "hidden"}>
                        {promo.active ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <EditPromoModal promo={promo} />
                        <DeletePromoButton code={promo.code} />
                      </div>
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
