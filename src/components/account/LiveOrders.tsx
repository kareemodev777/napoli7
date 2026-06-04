"use client";

import { useEffect, useRef, useState } from "react";
import { ReorderButton } from "@/components/account/ReorderButton";
import { StatusBadge } from "@/components/account/StatusBadge";
import {
  diffOrderStatuses,
  type OrderStatus,
  type OrderStatusSnapshot,
} from "@/lib/notifications/status-updates";
import type { CartItemInput } from "@/store/cart";

export interface LiveOrderRow {
  id: string;
  orderNumber: string;
  totalAed: number;
  status: OrderStatus;
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
        const data = (await res.json()) as { orders?: OrderStatusSnapshot[] };
        if (cancelled || !data.orders) return;

        const changes = diffOrderStatuses(snapshotRef.current, data.orders);
        snapshotRef.current = data.orders;

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
          return (
            <li
              key={o.id}
              className="grid grid-cols-1 md:grid-cols-[140px_1fr_140px_120px_110px] gap-3 md:gap-6 items-baseline py-5 border-b border-border"
            >
              <span className="font-display tabular-nums tracking-[0.1em] text-sm">
                {o.orderNumber}
              </span>
              <span className="text-sm text-muted-foreground">{o.summary}</span>
              <span className="font-display tabular-nums text-sm">
                {o.totalAed.toFixed(2)} AED
              </span>
              <StatusBadge status={status} />
              <ReorderButton
                items={o.reorderItems}
                changedCount={o.reorderChangedCount}
                unavailableCount={o.reorderUnavailableCount}
                disabled={o.reorderItems.length === 0}
              />
            </li>
          );
        })}
      </ul>
    </>
  );
}
