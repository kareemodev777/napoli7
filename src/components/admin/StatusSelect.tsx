"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/account/StatusBadge";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import {
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from "@/lib/notifications/status-updates";

const OPTIONS = (
  Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]
).map((value) => ({ value, label: ORDER_STATUS_LABELS[value] }));

/**
 * Controlled, optimistic order-status control for the admin orders table.
 *
 * Renders the two table cells it owns — the live status badge and the select —
 * so a change updates the visible row status instantly without a page refresh.
 * On error it reverts to the previous status and surfaces an accessible inline
 * message; on success it confirms with the status the server persisted.
 */
export function StatusSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [status, setStatus] = useState<OrderStatus>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as OrderStatus;
    const previous = status;
    setError(null);
    setStatus(next); // optimistic
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("status", next);
      const result = await updateOrderStatus(fd);
      if (result.error) {
        setStatus(previous); // revert
        setError(result.error);
      } else if (result.status) {
        setStatus(result.status); // confirm with the persisted value
      }
    });
  }

  return (
    <>
      <td className="py-4 pr-4">
        <StatusBadge status={status} />
      </td>
      <td className="py-4 pr-4">
        <select
          value={status}
          disabled={pending}
          onChange={handleChange}
          aria-label="Update order status"
          className="border border-border bg-background px-3 py-2 text-xs font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand disabled:opacity-50"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <span
          role="status"
          aria-live="polite"
          className={
            "mt-1 block text-[11px] tracking-[0.05em] " +
            (error ? "text-flag-red" : "text-muted-foreground")
          }
        >
          {error ? error : pending ? "Saving…" : ""}
        </span>
      </td>
    </>
  );
}
