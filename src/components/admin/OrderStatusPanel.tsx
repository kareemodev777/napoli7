"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/account/StatusBadge";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import {
  ORDER_STATUS_LABELS,
  orderStatusLane,
  type OrderStatus,
  type FulfillmentType,
} from "@/lib/notifications/status-updates";

/**
 * Compact status control for the order detail page header — a single card with
 * the current badge + a thin progress stepper and the shared actions
 * (confirm-gated next step / cancel + overlay override). Sits top-right so it
 * takes minimal vertical space. Optimistic locally + refreshes the page.
 */
export function OrderStatusPanel({
  orderId,
  current,
  deliveryType,
  bare = false,
}: {
  orderId: string;
  current: OrderStatus;
  deliveryType: FulfillmentType;
  /** Render inline (no card chrome) — for the top/bottom action bars. */
  bare?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lane = orderStatusLane(deliveryType);
  const currentIndex = lane.indexOf(status);

  function setTo(target: OrderStatus) {
    if (target === status) return;
    const previous = status;
    setError(null);
    setStatus(target); // optimistic
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("status", target);
      const result = await updateOrderStatus(fd);
      if (result.error) {
        setStatus(previous);
        setError(result.error);
      } else {
        if (result.status) setStatus(result.status);
        router.refresh();
      }
    });
  }

  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          {status !== "cancelled" ? (
            <div className="flex items-center gap-1" aria-hidden>
              {lane.map((s, i) => (
                <span
                  key={s}
                  title={ORDER_STATUS_LABELS[s]}
                  className={`h-1.5 rounded-full transition-all ${
                    i <= currentIndex ? "w-4 bg-brand" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>
        <OrderStatusActions
          status={status}
          deliveryType={deliveryType}
          pending={pending}
          onSet={setTo}
          compact
        />
      </div>
      {error ? (
        <p role="status" className="mt-2 text-xs text-flag-red">
          {error}
        </p>
      ) : null}
    </>
  );

  if (bare) return <div>{inner}</div>;

  return (
    <div className="rounded-md border border-border bg-card p-3 lg:min-w-[320px]">
      {inner}
    </div>
  );
}
