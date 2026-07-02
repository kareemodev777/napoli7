"use client";

import { useState, useTransition } from "react";
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
 * Guided order-status control for the admin orders table. Renders the status
 * badge + a compact progress stepper, and the shared actions (one-click "next
 * step" with a confirm popover, Cancel, and an overlay override menu). Optimistic
 * — the row updates instantly and reverts on error.
 */
export function StatusSelect({
  orderId,
  current,
  deliveryType,
}: {
  orderId: string;
  current: OrderStatus;
  deliveryType: FulfillmentType;
}) {
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
        setStatus(previous); // revert
        setError(result.error);
      } else if (result.status) {
        setStatus(result.status);
      }
    });
  }

  return (
    <>
      <td className="py-4 pr-4">
        <StatusBadge status={status} />
        {status !== "cancelled" ? (
          <div className="mt-2 flex items-center gap-1" aria-hidden>
            {lane.map((s, i) => (
              <span
                key={s}
                title={ORDER_STATUS_LABELS[s]}
                className={`h-1.5 rounded-full transition-all ${
                  i <= currentIndex ? "w-5 bg-brand" : "w-2.5 bg-muted"
                }`}
              />
            ))}
          </div>
        ) : null}
      </td>
      <td className="py-4 pr-4">
        <OrderStatusActions
          status={status}
          deliveryType={deliveryType}
          pending={pending}
          onSet={setTo}
        />
        {error ? (
          <span role="status" className="mt-1 block text-[11px] text-flag-red">
            {error}
          </span>
        ) : null}
      </td>
    </>
  );
}
