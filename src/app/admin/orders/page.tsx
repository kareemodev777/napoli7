import type { Metadata } from "next";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { StatusBadge } from "@/components/account/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

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
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  createdAt: string;
  items: { product_name: string; quantity: number }[];
}

async function loadOrders(): Promise<AdminOrderRow[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_name, customer_phone, total_aed, delivery_type, delivery_slot, status, created_at, order_items(product_name, quantity)",
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
    createdAt: row.created_at,
    items: row.order_items ?? [],
  }));
}

export default async function AdminOrdersPage() {
  const orders = await loadOrders();
  return (
    <section className="px-6 md:px-10 py-12">
      <div className="max-w-[1400px] mx-auto">
        <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
          Live orders
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {orders.length === 0
            ? "No orders yet."
            : `${orders.length} orders, newest first.`}
        </p>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm border-t border-border">
            <thead>
              <tr className="text-left font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
                <th className="py-3 pr-4">Order</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Items</th>
                <th className="py-3 pr-4">Total</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Slot</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Update</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="py-4 pr-4 font-display tabular-nums">
                    {o.orderNumber}
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
                  <td className="py-4 pr-4 text-xs uppercase tracking-[0.1em]">
                    {o.deliveryType}
                  </td>
                  <td className="py-4 pr-4 text-xs">{o.deliverySlot}</td>
                  <td className="py-4 pr-4">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="py-4 pr-4">
                    <StatusSelect orderId={o.id} current={o.status} />
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
