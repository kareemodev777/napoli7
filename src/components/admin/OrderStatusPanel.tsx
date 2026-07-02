"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { OrderStatusActions } from "@/components/admin/OrderStatusActions";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import {
  ORDER_STATUS_LABELS,
  orderStatusLane,
  type OrderStatus,
  type FulfillmentType,
} from "@/lib/notifications/status-updates";

/**
 * Full guided status control for the order detail page: a labelled progress
 * stepper for the order's lane plus the shared actions (confirm-gated next
 * step / cancel, and an overlay override menu). Optimistic locally + refreshes
 * the page so the header badge stays in sync.
 */
export function OrderStatusPanel({
  orderId,
  current,
  deliveryType,
}: {
  orderId: string;
  current: OrderStatus;
  deliveryType: FulfillmentType;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const lane = orderStatusLane(deliveryType);
  const currentIndex = lane.indexOf(status);
  const isCancelled = status === "cancelled";

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
        setStatus(previous); // revert
        setError(result.error);
      } else {
        if (result.status) setStatus(result.status);
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 rounded-md border border-border bg-card p-5">
      <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground">
        Order status
      </p>

      {isCancelled ? (
        <p className="mt-4 border border-flag-red/40 bg-flag-red/5 px-4 py-3 text-sm text-flag-red">
          This order was cancelled.
        </p>
      ) : (
        <ol className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-4">
          {lane.map((s, i) => {
            const isPast = i < currentIndex;
            const isActive = i === currentIndex;
            return (
              <li
                key={s}
                aria-current={isActive ? "step" : undefined}
                className={`flex flex-col gap-1 p-4 ${
                  isActive
                    ? "bg-brand text-primary-foreground"
                    : isPast
                      ? "bg-muted text-muted-foreground"
                      : "bg-background text-muted-foreground"
                }`}
              >
                <span className="font-display text-[10px] tabular-nums tracking-[0.2em]">
                  0{i + 1}
                </span>
                <span className="font-display text-xs uppercase tracking-[0.12em]">
                  {ORDER_STATUS_LABELS[s]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-4">
        <OrderStatusActions
          status={status}
          deliveryType={deliveryType}
          pending={pending}
          onSet={setTo}
        />
      </div>

      {error ? (
        <p role="status" className="mt-2 text-xs text-flag-red">
          {error}
        </p>
      ) : null}
    </div>
  );
}
