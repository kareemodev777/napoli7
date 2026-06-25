import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { HAS_SUPABASE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { CartClearer } from "./CartClearer";
import { PaymentStatusPoller } from "./PaymentStatusPoller";

interface Params {
  id: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Order confirmed",
    description: "Your Napoli 7 order has been received.",
    alternates: { canonical: `/order/${id}/confirmation` },
    robots: { index: false, follow: false },
  };
}

interface OrderForConfirmation {
  id: string;
  orderNumber: string;
  totalAed: number;
  paymentMethod: string;
  paymentStatus: string;
  deliveryType: "delivery" | "pickup";
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
      deliveryType: "delivery",
      customerPhone: "",
      items: [],
    };
  }
  try {
    const supabase = await createClient();
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, order_number, total_aed, payment_method, payment_status, delivery_type, customer_phone, order_items(product_name, quantity, line_total_aed)",
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
      deliveryType: order.delivery_type,
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
  } catch (e) {
    // A transient DB/network error must not crash the page right after payment.
    console.error("[confirmation] loadOrder failed for", id, e);
    return null;
  }
}

type PaymentView = {
  eyebrow: string;
  heading: string;
  message: string;
  /** Show the order summary + track button (a confirmed/processing order). */
  showOrder: boolean;
  /** Card payment still pending — keep refreshing until the webhook lands. */
  poll: boolean;
  /** Payment failed — offer a retry back to checkout. */
  showRetry: boolean;
};

function deriveView(order: OrderForConfirmation): PaymentView {
  const isCard = order.paymentMethod === "card";
  const isPickup = order.deliveryType === "pickup";
  const estimate = isPickup
    ? "Pickup is usually ready in around 15 minutes."
    : "Estimated delivery: 30–45 minutes.";

  if (!isCard) {
    return {
      eyebrow: "Confirmation",
      heading: "Order received.",
      message: `Your order is in. Pay cash ${isPickup ? "at pickup" : "to the driver on arrival"}. Payment status: pending. ${estimate}`,
      showOrder: true,
      poll: false,
      showRetry: false,
    };
  }

  switch (order.paymentStatus) {
    case "paid":
      return {
        eyebrow: "Payment received",
        heading: "Order confirmed.",
        message: `Your card payment went through and the kitchen has your order. Payment status: paid. ${estimate}`,
        showOrder: true,
        poll: false,
        showRetry: false,
      };
    case "failed":
      return {
        eyebrow: "Payment failed",
        heading: "Payment didn’t go through.",
        message:
          "Your card wasn’t charged. You can try again, or call us on +971 6 534 5772 to place the order by phone.",
        showOrder: false,
        poll: false,
        showRetry: true,
      };
    case "refunded":
      return {
        eyebrow: "Refunded",
        heading: "This order was refunded.",
        message:
          "We’ve refunded your card. Refunds take a few business days to appear. Questions? Call +971 6 534 5772.",
        showOrder: true,
        poll: false,
        showRetry: false,
      };
    case "partially_refunded":
      return {
        eyebrow: "Partially refunded",
        heading: "Part of this order was refunded.",
        message:
          "We’ve issued a partial refund to your card — it takes a few business days to appear. For a breakdown, call us on +971 6 534 5772.",
        showOrder: true,
        poll: false,
        showRetry: false,
      };
    case "disputed":
      return {
        eyebrow: "Payment under review",
        heading: "This payment is under review.",
        message:
          "Your card payment is being reviewed with your bank. We’ll be in touch — if you have questions, call us on +971 6 534 5772.",
        showOrder: true,
        poll: false,
        showRetry: false,
      };
    case "pending":
    default:
      return {
        eyebrow: "Payment processing",
        heading: "Confirming your payment…",
        message:
          "Hang tight — we’re confirming your card payment. This page updates automatically and usually takes a few seconds.",
        showOrder: true,
        poll: true,
        showRetry: false,
      };
  }
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const order = await loadOrder(id);
  const view = order ? deriveView(order) : null;

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[720px] mx-auto">
          {order && view ? (
            <>
              {view.poll ? <PaymentStatusPoller /> : null}
              {/* Empty the cart as soon as the confirmation page renders. Reaching
                  this page means checkout completed: COD is placed, and a card
                  order only lands here via Stripe's success_url (a cancel/abandon
                  goes to /checkout). `showOrder` is false only for a failed card
                  payment — there we keep the cart so the retry CTA still works,
                  so we must NOT clear. Gating on `showOrder` clears immediately
                  for paid AND still-pending card orders, instead of waiting on the
                  webhook + poller to flip the status. */}
              {view.showOrder ? <CartClearer /> : null}
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
                {view.eyebrow}
              </p>
              <h1 className="font-display text-4xl md:text-5xl leading-tight">
                {view.heading}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Order number{" "}
                <span className="font-display tracking-[0.1em] text-foreground">
                  {order.orderNumber}
                </span>
                . {view.message}
              </p>

              {view.showOrder && order.items.length > 0 ? (
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
                {view.showRetry ? (
                  <Link
                    href="/checkout"
                    className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
                  >
                    Try payment again
                  </Link>
                ) : view.showOrder ? (
                  <Link
                    href={`/track?orderId=${encodeURIComponent(order.orderNumber)}&phone=${encodeURIComponent(order.customerPhone)}`}
                    className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
                  >
                    Track your order
                  </Link>
                ) : null}
                <Link
                  href="/menu"
                  className="inline-flex items-center border border-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
                >
                  Back to menu
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
                Confirmation
              </p>
              <h1 className="font-display text-4xl md:text-5xl leading-tight">
                Order not found.
              </h1>
              <p className="mt-6 text-base text-muted-foreground">
                The kitchen may not have logged this order — call us if you need
                help on +971 6 534 5772.
              </p>
            </>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
