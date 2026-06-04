"use client";

import { useEffect, useRef, useState } from "react";
import { StatusTimeline } from "./StatusTimeline";
import {
  statusChangeMessage,
  type OrderStatus,
} from "@/lib/notifications/status-updates";
import type { TrackedOrder } from "@/app/track/actions";

const POLL_INTERVAL_MS = 20_000;

/**
 * Live order display for the /track page. Seeds from the order the track form
 * just resolved, then polls the order-id + phone protected status endpoint and
 * updates the timeline in place, announcing each status change via aria-live.
 */
export function TrackStatus({ order }: { order: TrackedOrder }) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [announcement, setAnnouncement] = useState("");
  const statusRef = useRef<OrderStatus>(order.status);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      orderId: order.orderNumber,
      phone: order.phone,
    });

    async function poll() {
      try {
        const res = await fetch(`/api/track/status?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: OrderStatus };
        if (cancelled || !data.status) return;

        if (data.status !== statusRef.current) {
          statusRef.current = data.status;
          setStatus(data.status);
          setAnnouncement(
            statusChangeMessage(order.orderNumber, data.status),
          );
        }
      } catch {
        // Transient network errors are ignored; the next tick retries.
      }
    }

    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order.orderNumber, order.phone]);

  return (
    <div className="space-y-4">
      <p aria-live="polite" role="status" className="sr-only">
        {announcement}
      </p>
      {announcement ? (
        <div className="border border-brand/40 bg-brand-soft px-4 py-3 text-sm text-brand-deep">
          {announcement}
        </div>
      ) : null}
      <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep">
        Order {order.orderNumber}
      </p>
      <StatusTimeline status={status} />
      <p className="text-sm text-muted-foreground">
        {order.deliveryType === "delivery" ? "Delivery" : "Pickup"} ·{" "}
        {order.deliverySlot}
      </p>
    </div>
  );
}
