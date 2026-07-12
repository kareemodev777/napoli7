import type { Metadata } from "next";
import Link from "next/link";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { OrdersAutoRefresh } from "@/components/admin/OrdersAutoRefresh";
import { PosSyncCell } from "@/components/admin/PosSyncCell";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";
import { paymentSummary, type PaymentTone } from "@/lib/payments/order-display";

export const metadata: Metadata = {
  title: "Orders · Admin",
  alternates: { canonical: "/admin/orders" },
  robots: { index: false, follow: false },
};

interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  totalAed: number;
  deliveryType: "delivery" | "pickup";
  deliverySlot: string;
  status:
    | "received"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  paymentMethod: string;
  paymentStatus: string;
  posSyncStatus: string;
  posInvoiceNumber: string | null;
  createdAt: string;
  items: { product_name: string; quantity: number }[];
}

async function loadOrders(): Promise<AdminOrderRow[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, total_aed, delivery_type, delivery_slot, status, payment_method, payment_status, pos_sync_status, pos_invoice_number, created_at, order_items(product_name, quantity)",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    totalAed: Number(row.total_aed),
    deliveryType: row.delivery_type,
    deliverySlot: row.delivery_slot,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    posSyncStatus: row.pos_sync_status,
    posInvoiceNumber: row.pos_invoice_number ?? null,
    createdAt: row.created_at,
    items: row.order_items ?? [],
  }));
}

export default async function AdminOrdersPage() {
  const orders = await loadOrders();
  return (
    <section className="px-6 md:px-10 py-12">
      <OrdersAutoRefresh />
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Live orders
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {orders.length === 0
                ? "No orders yet."
                : `${orders.length} orders, newest first.`}
            </p>
          </div>
          <Link
            href="/admin/orders/new"
            className="inline-flex items-center bg-brand text-primary-foreground px-5 py-3 font-display text-[11px] tracking-[0.2em] uppercase hover:bg-brand-hover"
          >
            + Phone order
          </Link>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Items</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Payment</th>
                <th className="py-3 pr-4">POS</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Slot</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Edit</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="py-4 pr-4 font-display tabular-nums">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="underline decoration-dotted underline-offset-4 hover:text-azure-deep"
                    >
                      {o.orderNumber}
                    </Link>
                  </td>
                  <td className="py-4 pr-4">
                    <div>{o.customerName}</div>
                    <a
                      href={`tel:${o.customerPhone}`}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      {o.customerPhone}
                    </a>
                  </td>
                  <td className="py-4 pr-4 max-w-xs">
                    {o.items.map((it) => (
                      <div key={it.product_name} className="text-xs">
                        {it.quantity} × {it.product_name}
                      </div>
                    ))}
                  </td>
                  <td className="py-4 pr-4 font-display tabular-nums">
                    {o.totalAed.toFixed(2)} AED
                  </td>
                  <td className="py-4 pr-4">
                    <PaymentTag
                      paymentMethod={o.paymentMethod}
                      paymentStatus={o.paymentStatus}
                    />
                  </td>
                  <td className="py-4 pr-4">
                    <PosSyncCell
                      orderId={o.id}
                      status={o.posSyncStatus}
                      invoiceNumber={o.posInvoiceNumber}
                      payable={
                        o.status !== "cancelled" &&
                        (o.paymentMethod === "cod" ||
                          o.paymentStatus === "paid")
                      }
                    />
                  </td>
                  <td className="py-4 pr-4 text-xs uppercase tracking-[0.1em]">
                    {o.deliveryType}
                  </td>
                  <td className="py-4 pr-4 text-xs">{o.deliverySlot}</td>
                  {/* Renders both the live status badge cell and the
                      update-select cell, kept in sync optimistically. */}
                  <StatusSelect
                    orderId={o.id}
                    current={o.status}
                    deliveryType={o.deliveryType}
                  />
                  <td className="py-4 pr-4">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="inline-flex items-center border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] hover:bg-muted"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const PAYMENT_TONE_CLASSES: Record<PaymentTone, string> = {
  paid: "bg-flag-green/15 text-flag-green",
  unpaid: "bg-flag-red/10 text-flag-red",
  warn: "bg-azure-soft text-azure-deep",
  cod: "bg-muted text-muted-foreground",
};

/** At-a-glance payment state for the admin orders table. */
function PaymentTag({
  paymentMethod,
  paymentStatus,
}: {
  paymentMethod: string;
  paymentStatus: string;
}) {
  const { label, tone } = paymentSummary(paymentMethod, paymentStatus);
  return (
    <span
      className={
        "inline-flex items-center whitespace-nowrap px-2.5 py-1 font-display text-[10px] tracking-[0.16em] uppercase " +
        PAYMENT_TONE_CLASSES[tone]
      }
    >
      {label}
    </span>
  );
}

