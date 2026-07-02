import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Pizza, ChevronDown } from "lucide-react";
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
      "id, order_number, customer_name, customer_phone, customer_email, status, payment_method, payment_status, pos_sync_status, pos_invoice_number, delivery_type, delivery_address, delivery_slot, pizza_cut, subtotal_aed, delivery_fee_aed, discount_aed, total_aed, promo_code, order_notes, admin_notes, assigned_rider_id, created_at, order_items(id, product_id, product_name, base_price_aed, quantity, customizations, line_total_aed, size_label)",
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
    .select("id, name, price_aed, image_url")
    .eq("is_active", true)
    .order("category_id")
    .order("position");

  // order_items.product_id has no FK to products, so PostgREST can't embed the
  // product row directly — look images up separately by product id.
  const imageByProductId = new Map<string, string>();
  (products ?? []).forEach((product) => {
    if (product.image_url) imageByProductId.set(product.id, product.image_url);
  });

  // Active riders, plus this order's currently assigned rider even if it has
  // since been deactivated, so the selection always shows who it's assigned to.
  const assignedRiderId = data.assigned_rider_id as string | null;
  const ridersQuery = supabase
    .from("riders")
    .select("id, name, phone")
    .order("name");
  const { data: riders } = await (assignedRiderId
    ? ridersQuery.or(`is_active.eq.true,id.eq.${assignedRiderId}`)
    : ridersQuery.eq("is_active", true));

  return {
    order: data,
    edits: (edits ?? []) as OrderEditRow[],
    imageByProductId,
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

/**
 * Collapsible card (native <details>, no client JS). Progressive disclosure keeps
 * the page short: the receipt + status stay open, while the heavy edit form and
 * history collapse so an admin can take in the whole order without scrolling.
 */
function Panel({
  title,
  meta,
  defaultOpen = false,
  children,
}: {
  title: string;
  meta?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group rounded-md border border-border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2.5">
          <ChevronDown
            className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
            aria-hidden
          />
          <h2 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {title}
          </h2>
        </div>
        {meta ? (
          <span className="font-display text-[11px] uppercase tracking-[0.14em] capitalize text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </summary>
      <div className="border-t border-border p-5">{children}</div>
    </details>
  );
}

export default async function AdminOrderEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const loaded = await loadOrder(id);
  if (!loaded) notFound();
  const { order, edits, products, riders, imageByProductId } = loaded;

  const deliveryAddress = order.delivery_address as {
    street?: string;
    area?: string;
    flat?: string;
    notes?: string;
    mapQuery?: string;
    lat?: number;
    lng?: number;
  } | null;
  const deliveryMapQuery =
    deliveryAddress?.mapQuery ?? buildDeliveryMapQuery(deliveryAddress);
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
      product_id: string | null;
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
      imageUrl: it.product_id
        ? (imageByProductId.get(it.product_id) ?? null)
        : null,
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

        {/* Sticky action bar — order id + live status + Save, always in reach. */}
        <div className="sticky top-0 z-20 -mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-10 md:px-10">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-display text-2xl uppercase tracking-[1.5px] md:text-3xl">
              {order.order_number}
            </h1>
            <span className="rounded-md border border-border bg-card px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {order.payment_method} · {order.payment_status}
            </span>
            <span className="text-xs text-muted-foreground">{placedAt}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <OrderStatusPanel
              orderId={order.id as string}
              current={order.status as OrderStatus}
              deliveryType={order.delivery_type as FulfillmentType}
              bare
            />
            <button
              type="submit"
              form="order-edit-form"
              className="inline-flex items-center bg-brand px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-brand-hover"
            >
              Save changes
            </button>
          </div>
        </div>

        {/* Shopify-style split: a wide main column and a details sidebar. */}
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* ---- Main: items, totals, edit, history ---- */}
          <div className="space-y-6">
            <Panel
              title="Items"
              meta={`${order.delivery_type} · ${order.delivery_slot}`}
              defaultOpen
            >
              <ul className="divide-y divide-border border-y border-border">
                {summaryItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start gap-3 py-3 text-sm"
                  >
                    {/* Wrapper is NOT clipped so the quantity badge can overflow. */}
                    <span className="relative shrink-0">
                      <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                        {it.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={it.imageUrl}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Pizza
                            className="h-5 w-5 text-muted-foreground"
                            strokeWidth={1.7}
                            aria-hidden
                          />
                        )}
                      </span>
                      <span className="absolute -right-1.5 -top-1.5 z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-display text-[10px] leading-none text-primary-foreground ring-2 ring-card">
                        {it.quantity}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{it.productName}</p>
                      {it.extras.length > 0 || it.removed.length > 0 ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {[...it.extras, ...it.removed].join(" · ")}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                        {it.quantity} × {it.basePriceAed.toFixed(2)} AED
                      </p>
                    </div>
                    <span className="shrink-0 font-display tabular-nums">
                      {it.lineTotalAed.toFixed(2)} AED
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-4 space-y-1 text-sm tabular-nums">
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
            </Panel>

            <Panel title="Edit order" meta="items · fees · discount">
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
            </Panel>

            {edits.length > 0 ? (
              <Panel
                title="Edit history"
                meta={`${edits.length} change${edits.length > 1 ? "s" : ""}`}
              >
                <ul className="space-y-2">
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
                        {labelForHandling(
                          edit.payment_handling as PaymentHandling,
                        )}
                        {edit.note ? ` · ${edit.note}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>

          {/* ---- Sidebar: customer, fulfilment, POS ---- */}
          <aside className="space-y-6">
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                Customer
              </h3>
              <p className="mt-3 font-medium">{order.customer_name}</p>
              <a
                href={`tel:${order.customer_phone}`}
                className="mt-1 block text-sm text-azure-deep hover:underline"
              >
                {order.customer_phone}
              </a>
              {order.customer_email ? (
                <a
                  href={`mailto:${order.customer_email}`}
                  className="block break-all text-sm text-azure-deep hover:underline"
                >
                  {order.customer_email}
                </a>
              ) : null}
            </div>

            <div className="rounded-md border border-border bg-card p-5 text-sm">
              <h3 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {order.delivery_type === "delivery" ? "Delivery" : "Pickup"}
              </h3>
              <p className="mt-3">Slot: {order.delivery_slot}</p>
              <p className="mt-1">
                Pizza cut: {order.pizza_cut ? "Yes" : "No"}
              </p>

              {order.delivery_type === "delivery" && deliveryAddress ? (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  <p>{deliveryAddress.street ?? ""}</p>
                  <p>
                    {[
                      deliveryAddress.flat
                        ? `Flat ${deliveryAddress.flat}`
                        : null,
                      deliveryAddress.area,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  {deliveryAddress.notes ? (
                    <p className="text-muted-foreground">
                      Notes: {deliveryAddress.notes}
                    </p>
                  ) : null}
                  {hasGps ? (
                    <a
                      href={buildGpsMapsUrl(
                        deliveryAddress!.lat!,
                        deliveryAddress!.lng!,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block text-xs uppercase tracking-[0.18em] text-azure-deep underline underline-offset-2"
                    >
                      Open GPS pin
                    </a>
                  ) : deliveryMapQuery ? (
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Pin: {deliveryMapQuery}
                    </p>
                  ) : null}
                  {hasGps ? (
                    <div className="mt-2">
                      <MapEmbed
                        lat={deliveryAddress!.lat!}
                        lng={deliveryAddress!.lng!}
                        title={`Delivery pin for ${order.order_number}`}
                      />
                    </div>
                  ) : deliveryMapQuery ? (
                    <div className="mt-2">
                      <MapEmbed
                        query={deliveryMapQuery}
                        title={`Delivery pin for ${order.order_number}`}
                      />
                    </div>
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
              ) : null}
            </div>

            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                POS
              </h3>
              {order.pos_invoice_number ? (
                <p className="mt-3 text-sm">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    Invoice:{" "}
                  </span>
                  <span className="font-mono tabular-nums">
                    {order.pos_invoice_number as string}
                  </span>
                </p>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Not yet synced. Push manually if the automatic sync failed.
                </p>
              )}
              <div className="mt-3">
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
            </div>

            {order.admin_notes ? (
              <div className="rounded-md border border-border bg-card p-5">
                <h3 className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Admin notes
                </h3>
                <pre className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                  {order.admin_notes}
                </pre>
              </div>
            ) : null}
          </aside>
        </div>

        {/* Bottom action bar — repeats the key actions after a long scroll. */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <OrderStatusPanel
            orderId={order.id as string}
            current={order.status as OrderStatus}
            deliveryType={order.delivery_type as FulfillmentType}
            bare
          />
          <button
            type="submit"
            form="order-edit-form"
            className="inline-flex items-center bg-brand px-5 py-2.5 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground hover:bg-brand-hover"
          >
            Save changes
          </button>
        </div>
      </div>
    </section>
  );
}
