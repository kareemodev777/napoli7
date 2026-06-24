"use client";

import { useEffect, useRef, useState } from "react";
import { ReorderButton } from "@/components/account/ReorderButton";
import { StatusBadge } from "@/components/account/StatusBadge";
import {
  diffOrderStatuses,
  type OrderStatus,
  type OrderStatusSnapshot,
} from "@/lib/notifications/status-updates";
import { customerOrderView } from "@/lib/payments/order-display";
import type { CartItemInput } from "@/store/cart";

export interface LiveOrderRow {
  id: string;
  orderNumber: string;
  totalAed: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: string;
  summary: string;
  reorderItems: CartItemInput[];
  reorderChangedCount: number;
  reorderUnavailableCount: number;
}

const POLL_INTERVAL_MS = 20_000;

/**
 * Client-side owner of order-status state for /account/orders. Renders the
 * order list from server-provided rows, then polls the authenticated status
 * endpoint and updates badges in place when admin changes a status, announcing
 * each change through an aria-live region for screen-reader users.
 */
export function LiveOrders({ orders }: { orders: LiveOrderRow[] }) {
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>(() =>
    Object.fromEntries(orders.map((o) => [o.id, o.status])),
  );
  // Payment status is polled alongside fulfilment status so an "Awaiting
  // payment" row flips to its real status the moment the Stripe webhook lands
  // (e.g. the customer paid in another tab) without a manual refresh.
  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<string, string>
  >(() => Object.fromEntries(orders.map((o) => [o.id, o.paymentStatus])));
  const [announcement, setAnnouncement] = useState("");
  // Latest snapshot to diff the next poll against, kept in a ref so the polling
  // effect can read it without re-subscribing on every status change.
  const snapshotRef = useRef<OrderStatusSnapshot[]>(
    orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
    })),
  );

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/account/orders/status", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          orders?: (OrderStatusSnapshot & { paymentStatus?: string })[];
        };
        if (cancelled || !data.orders) return;

        const changes = diffOrderStatuses(snapshotRef.current, data.orders);
        snapshotRef.current = data.orders;

        // Payment status can change without the fulfilment status changing
        // (pending -> paid / failed), so refresh it every tick regardless.
        setPaymentStatuses((prev) => {
          const next = { ...prev };
          for (const o of data.orders!) {
            if (o.paymentStatus) next[o.id] = o.paymentStatus;
          }
          return next;
        });

        if (changes.length > 0) {
          setStatuses((prev) => {
            const next = { ...prev };
            for (const change of changes) next[change.id] = change.status;
            return next;
          });
          setAnnouncement(changes.map((c) => c.message).join(". "));
        }
      } catch {
        // Network hiccups are non-fatal — the next tick retries.
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <>
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>
      {announcement ? (
        <div className="mt-6 border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          {announcement}
        </div>
      ) : null}
      <ul className="mt-10 border-t border-border">
        {orders.map((o) => {
          const status = statuses[o.id] ?? o.status;
          const paymentStatus = paymentStatuses[o.id] ?? o.paymentStatus;
          const view = customerOrderView({
            status,
            paymentMethod: o.paymentMethod,
            paymentStatus,
          });
          return (
            <li
              key={o.id}
              className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_140px_140px] gap-3 md:gap-6 items-baseline py-5 border-b border-border"
            >
              <span className="font-display tabular-nums tracking-[0.1em] text-sm">
                {o.orderNumber}
              </span>
              <span className="text-sm text-muted-foreground">{o.summary}</span>
              <span className="font-display tabular-nums text-sm">
                {o.totalAed.toFixed(2)} AED
              </span>
              {view.kind === "awaiting_payment" ? (
                <PaymentBadge tone="info">Awaiting payment</PaymentBadge>
              ) : view.kind === "payment_failed" ? (
                <PaymentBadge tone="error">Payment failed</PaymentBadge>
              ) : (
                <StatusBadge status={status} />
              )}
              {view.kind === "awaiting_payment" ? (
                <a
                  href={`/api/checkout/create-session?orderId=${encodeURIComponent(o.id)}`}
                  className="inline-flex items-center justify-center bg-brand text-primary-foreground px-3 py-2 font-display text-[10px] tracking-[0.16em] uppercase hover:bg-brand-hover"
                >
                  Complete payment
                </a>
              ) : (
                <ReorderButton
                  items={o.reorderItems}
                  changedCount={o.reorderChangedCount}
                  unavailableCount={o.reorderUnavailableCount}
                  disabled={o.reorderItems.length === 0}
                />
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Badge for the two payment-driven states a card order can show in place of its
 * fulfilment status: "Awaiting payment" (info) and "Payment failed" (error).
 * Mirrors the look of StatusBadge so the column stays visually consistent.
 */
function PaymentBadge({
  tone,
  children,
}: {
  tone: "info" | "error";
  children: React.ReactNode;
}) {
  const classes =
    tone === "error"
      ? "bg-flag-red/10 text-flag-red"
      : "bg-azure-soft text-azure-deep";
  return (
    <span
      className={
        "inline-flex items-center px-2.5 py-1 font-display text-[10px] tracking-[0.2em] uppercase " +
        classes
      }
    >
      {children}
    </span>
  );
}
