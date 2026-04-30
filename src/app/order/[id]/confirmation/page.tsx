import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { HAS_SUPABASE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

interface Params {
  id: string;
}

export const metadata: Metadata = {
  title: "Order confirmed",
  description: "Your Napoli 7 order has been received.",
  robots: { index: false, follow: false },
};

interface OrderForConfirmation {
  id: string;
  orderNumber: string;
  totalAed: number;
  paymentMethod: string;
  paymentStatus: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    lineTotal: number;
  }>;
}

async function loadOrder(id: string): Promise<OrderForConfirmation | null> {
  if (!HAS_SUPABASE) {
    return {
      id,
      orderNumber: "N7-DEMO",
      totalAed: 0,
      paymentMethod: "cod",
      paymentStatus: "pending",
      customerPhone: "",
      items: [],
    };
  }
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_aed, payment_method, payment_status, customer_phone, order_items(product_name, quantity, line_total_aed)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;
  return {
    id: order.id,
    orderNumber: order.order_number,
    totalAed: Number(order.total_aed),
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    customerPhone: order.customer_phone,
    items: (order.order_items ?? []).map(
      (it: {
        product_name: string;
        quantity: number;
        line_total_aed: number | string;
      }) => ({
        name: it.product_name,
        quantity: it.quantity,
        lineTotal: Number(it.line_total_aed),
      }),
    ),
  };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[720px] mx-auto">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
            Confirmation
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            Order confirmed.
          </h1>
          {order ? (
            <>
              <p className="mt-4 text-lg text-muted-foreground">
                Order number{" "}
                <span className="font-display tracking-[0.1em] text-foreground">
                  {order.orderNumber}
                </span>
                . Estimated delivery: 30–45 minutes.
              </p>

              {order.items.length > 0 ? (
                <ul className="mt-10 border-t border-border">
                  {order.items.map((it, i) => (
                    <li
                      key={`${it.name}-${i}`}
                      className="flex justify-between gap-3 py-4 border-b border-border text-sm"
                    >
                      <span>
                        {it.quantity} × {it.name}
                      </span>
                      <span className="tabular-nums">
                        {it.lineTotal.toFixed(2)} AED
                      </span>
                    </li>
                  ))}
                  <li className="flex justify-between gap-3 py-5 font-display tracking-[0.1em] uppercase">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {order.totalAed.toFixed(2)} AED
                    </span>
                  </li>
                </ul>
              ) : null}

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link
                  href={`/track?orderId=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`}
                  className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
                >
                  Track your order
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center border border-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
                >
                  Back to menu
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-6 text-base text-muted-foreground">
              Order not found. The kitchen may not have logged this order — call
              us if you need help on +971 6 534 5772.
            </p>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
