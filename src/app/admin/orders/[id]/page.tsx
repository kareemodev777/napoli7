import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/account/StatusBadge";
import {
  OrderEditForm,
  type EditOrderItem,
  type EditOrderProduct,
} from "@/components/admin/OrderEditForm";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { labelForHandling, type PaymentHandling } from "@/lib/admin/order-edit";

export const metadata: Metadata = {
  title: "Edit order · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface OrderEditRow {
  id: string;
  old_total_aed: number | string;
  new_total_aed: number | string;
  difference_aed: number | string;
  payment_handling: string;
  note: string | null;
  created_at: string;
}

async function loadOrder(id: string) {
  if (!HAS_SUPABASE_SERVICE) return null;
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, status, payment_method, payment_status, subtotal_aed, delivery_fee_aed, discount_aed, total_aed, order_notes, admin_notes, order_items(id, product_name, quantity, line_total_aed)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { data: edits } = await supabase
    .from("order_edits")
    .select(
      "id, old_total_aed, new_total_aed, difference_aed, payment_handling, note, created_at",
    )
    .eq("order_id", id)
    .order("created_at", { ascending: false });

  const { data: products } = await supabase
    .from("products")
    .select("id, name, price_aed")
    .eq("is_active", true)
    .order("category_id")
    .order("position");

  return {
    order: data,
    edits: (edits ?? []) as OrderEditRow[],
    products: (products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      priceAed: Number(product.price_aed),
    })) satisfies EditOrderProduct[],
  };
}

export default async function AdminOrderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadOrder(id);
  if (!loaded) notFound();
  const { order, edits, products } = loaded;

  const items: EditOrderItem[] = (order.order_items ?? []).map(
    (it: {
      id: string;
      product_name: string;
      quantity: number;
      line_total_aed: number | string;
    }) => ({
      id: it.id,
      productName: it.product_name,
      quantity: it.quantity,
      lineTotalAed: Number(it.line_total_aed),
    }),
  );

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <Link
          href="/admin/orders"
          className="font-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
        >
          ← Back to orders
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
            {order.order_number}
          </h1>
          <StatusBadge status={order.status} />
          <span className="rounded-md border border-border bg-card px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {order.payment_method} · {order.payment_status}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {order.customer_name} · {order.customer_phone}
        </p>

        <div className="mt-8">
          <OrderEditForm
            orderId={order.id}
            orderNumber={order.order_number}
            paymentMethod={order.payment_method}
            paymentStatus={order.payment_status}
            oldTotalAed={Number(order.total_aed)}
            deliveryFeeAed={Number(order.delivery_fee_aed)}
            discountAed={Number(order.discount_aed ?? 0)}
            orderNotes={order.order_notes ?? ""}
            items={items}
            products={products}
          />
        </div>

        {order.admin_notes ? (
          <div className="mt-10">
            <h2 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Admin notes
            </h2>
            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-border bg-card p-4 text-sm leading-relaxed">
              {order.admin_notes}
            </pre>
          </div>
        ) : null}

        {edits.length > 0 ? (
          <div className="mt-10">
            <h2 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Edit history
            </h2>
            <ul className="mt-3 space-y-2">
              {edits.map((edit) => (
                <li
                  key={edit.id}
                  className="rounded-md border border-border bg-card p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tabular-nums">
                      {Number(edit.old_total_aed).toFixed(2)} →{" "}
                      {Number(edit.new_total_aed).toFixed(2)} AED (
                      {Number(edit.difference_aed) >= 0 ? "+" : ""}
                      {Number(edit.difference_aed).toFixed(2)})
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(edit.created_at).toLocaleString("en-AE")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {labelForHandling(edit.payment_handling as PaymentHandling)}
                    {edit.note ? ` · ${edit.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
