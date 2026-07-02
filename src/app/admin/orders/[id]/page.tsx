import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/account/StatusBadge";
import { MapEmbed } from "@/components/site/MapEmbed";
import { buildDeliveryMapQuery, buildGpsMapsUrl } from "@/lib/delivery-map";
import { HAS_SUPABASE, HAS_SUPABASE_SERVICE } from "@/lib/env";
import { formatDateTime } from "@/lib/format-date";
import {
  OrderEditForm,
  type EditOrderItem,
  type EditOrderProduct,
} from "@/components/admin/OrderEditForm";
import {
  AssignRiderForm,
  type AssignableRider,
} from "@/components/admin/AssignRiderForm";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { labelForHandling, type PaymentHandling } from "@/lib/admin/order-edit";
import { SyncPosButton } from "@/components/admin/SyncPosButton";
import { OrderStatusPanel } from "@/components/admin/OrderStatusPanel";
import type {
  OrderStatus,
  FulfillmentType,
} from "@/lib/notifications/status-updates";

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
  if (!HAS_SUPABASE) return null;
  // Prefer the service-role client when it's configured, but fall back to the
  // authenticated admin client (the layout already gates on requireAdmin) so the
  // edit page never 404s just because the service-role key isn't set.
  const supabase = HAS_SUPABASE_SERVICE
    ? createServiceRoleClient()
    : await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, customer_email, status, payment_method, payment_status, pos_sync_status, pos_invoice_number, delivery_type, delivery_address, delivery_slot, pizza_cut, subtotal_aed, delivery_fee_aed, discount_aed, total_aed, promo_code, order_notes, admin_notes, assigned_rider_id, created_at, order_items(id, product_name, base_price_aed, quantity, customizations, line_total_aed, size_label)",
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

  // Active riders, plus this order's currently assigned rider even if it has
  // since been deactivated, so the selection always shows who it's assigned to.
  const assignedRiderId = data.assigned_rider_id as string | null;
  const ridersQuery = supabase.from("riders").select("id, name, phone").order("name");
  const { data: riders } = await (assignedRiderId
    ? ridersQuery.or(`is_active.eq.true,id.eq.${assignedRiderId}`)
    : ridersQuery.eq("is_active", true));

  return {
    order: data,
    edits: (edits ?? []) as OrderEditRow[],
    products: (products ?? []).map((product) => ({
      id: product.id,
      name: product.name,
      priceAed: Number(product.price_aed),
    })) satisfies EditOrderProduct[],
    riders: (riders ?? []).map((rider) => ({
      id: rider.id,
      name: rider.name,
      phone: rider.phone,
    })) satisfies AssignableRider[],
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
  const { order, edits, products, riders } = loaded;

  const deliveryAddress = order.delivery_address as
    | {
        street?: string;
        area?: string;
        flat?: string;
        notes?: string;
        mapQuery?: string;
        lat?: number;
        lng?: number;
      }
    | null;
  const deliveryMapQuery = deliveryAddress?.mapQuery ?? buildDeliveryMapQuery(deliveryAddress);
  const hasGps = deliveryAddress?.lat != null && deliveryAddress?.lng != null;

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

  // Read-only summary view: each line with its chosen extras/removals, so the
  // kitchen/admin sees exactly what the customer ordered without entering edit
  // mode. Mirrors the customization shape persisted at checkout.
  type OrderItemCustomization = {
    ingredient: string;
    choice: "default" | "extra" | "without";
    extraPrice?: number | string;
  };
  const summaryItems = (order.order_items ?? []).map(
    (it: {
      id: string;
      product_name: string;
      base_price_aed: number | string;
      quantity: number;
      customizations: OrderItemCustomization[] | null;
      line_total_aed: number | string;
      size_label: string | null;
    }) => ({
      id: it.id,
      productName: it.size_label
        ? `${it.product_name} (${it.size_label})`
        : it.product_name,
      basePriceAed: Number(it.base_price_aed),
      quantity: it.quantity,
      lineTotalAed: Number(it.line_total_aed),
      extras: (it.customizations ?? [])
        .filter((c) => c.choice === "extra")
        .map((c) =>
          Number(c.extraPrice) > 0
            ? `+ ${c.ingredient} (${Number(c.extraPrice).toFixed(2)})`
            : `+ ${c.ingredient}`,
        ),
      removed: (it.customizations ?? [])
        .filter((c) => c.choice === "without")
        .map((c) => `no ${c.ingredient}`),
    }),
  );

  const placedAt = formatDateTime(order.created_at as string);

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

        <OrderStatusPanel
          orderId={order.id as string}
          current={order.status as OrderStatus}
          deliveryType={order.delivery_type as FulfillmentType}
        />

        {order.delivery_type === "delivery" && deliveryAddress ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(0,420px)]">
            <div className="rounded-md border border-border bg-card p-5 text-sm space-y-2">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
                Delivery details
              </p>
              <p>{deliveryAddress.street ?? ""}</p>
              <p>
                {[deliveryAddress.flat ? `Flat ${deliveryAddress.flat}` : null, deliveryAddress.area]
                  .filter(Boolean)
                  .join(", ")}
              </p>
              {deliveryAddress.notes ? (
                <p className="text-muted-foreground">Notes: {deliveryAddress.notes}</p>
              ) : null}
              <p className="pt-2 font-medium">
                Pizza cut: {order.pizza_cut ? "Yes" : "No"}
              </p>
              {hasGps ? (
                <a
                  href={buildGpsMapsUrl(deliveryAddress!.lat!, deliveryAddress!.lng!)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs uppercase tracking-[0.18em] text-azure-deep underline underline-offset-2"
                >
                  Open GPS pin: {deliveryAddress!.lat!.toFixed(5)},{" "}
                  {deliveryAddress!.lng!.toFixed(5)}
                </a>
              ) : deliveryMapQuery ? (
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Pin: {deliveryMapQuery}
                </p>
              ) : null}
              <div className="mt-3 border-t border-border pt-3">
                <AssignRiderForm
                  orderId={order.id}
                  riders={riders}
                  currentRiderId={
                    (order.assigned_rider_id as string | null) ?? null
                  }
                />
              </div>
            </div>
            {hasGps ? (
              <MapEmbed
                lat={deliveryAddress!.lat!}
                lng={deliveryAddress!.lng!}
                title={`Delivery pin for ${order.order_number}`}
              />
            ) : deliveryMapQuery ? (
              <MapEmbed query={deliveryMapQuery} title={`Delivery pin for ${order.order_number}`} />
            ) : null}
          </div>
        ) : null}

        <div className="mt-8 rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Order summary
          </h2>

          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Placed
              </dt>
              <dd>{placedAt}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Fulfilment
              </dt>
              <dd className="capitalize">
                {order.delivery_type} · {order.delivery_slot}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Payment
              </dt>
              <dd>
                {order.payment_method} · {order.payment_status}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Email
              </dt>
              <dd className="truncate">{order.customer_email ?? "—"}</dd>
            </div>
          </dl>

          <ul className="mt-5 divide-y divide-border border-t border-border">
            {summaryItems.map((it) => (
              <li key={it.id} className="flex justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">
                    {it.quantity} × {it.productName}
                  </p>
                  {it.extras.length > 0 || it.removed.length > 0 ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[...it.extras, ...it.removed].join(" · ")}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                    {it.basePriceAed.toFixed(2)} AED each
                  </p>
                </div>
                <span className="shrink-0 font-display tabular-nums">
                  {it.lineTotalAed.toFixed(2)} AED
                </span>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm tabular-nums">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{Number(order.subtotal_aed).toFixed(2)} AED</dd>
            </div>
            {Number(order.delivery_fee_aed) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Delivery fee</dt>
                <dd>{Number(order.delivery_fee_aed).toFixed(2)} AED</dd>
              </div>
            ) : null}
            {Number(order.discount_aed ?? 0) > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">
                  Discount{order.promo_code ? ` (${order.promo_code})` : ""}
                </dt>
                <dd>−{Number(order.discount_aed).toFixed(2)} AED</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-border pt-2 font-display text-base">
              <dt>Total</dt>
              <dd>{Number(order.total_aed).toFixed(2)} AED</dd>
            </div>
          </dl>

          {order.order_notes ? (
            <p className="mt-4 border-t border-border pt-4 text-sm">
              <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Customer notes:{" "}
              </span>
              {order.order_notes}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-border bg-card p-5">
          <div>
            <h2 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
              POS
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Send this order to the POS (xtbooks). Use this if the automatic
              push failed or the order was paid before the POS was connected.
            </p>
            {order.pos_invoice_number ? (
              <p className="mt-2 text-sm">
                <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Invoice:{" "}
                </span>
                <span className="font-mono tabular-nums">
                  {order.pos_invoice_number as string}
                </span>
              </p>
            ) : null}
          </div>
          <SyncPosButton
            orderId={order.id}
            initialStatus={(order.pos_sync_status as string) ?? "pending"}
            payable={
              order.status !== "cancelled" &&
              (order.payment_method === "cod" ||
                order.payment_status === "paid")
            }
          />
        </div>

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
                      {formatDateTime(edit.created_at)}
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
