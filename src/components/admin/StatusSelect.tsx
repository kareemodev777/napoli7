"use client";

import { useState, useTransition } from "react";
import { ChevronRight, Check } from "lucide-react";
import { StatusBadge } from "@/components/account/StatusBadge";
import { updateOrderStatus } from "@/app/admin/orders/actions";
import {
  ORDER_STATUS_LABELS,
  orderStatusLane,
  nextOrderStatus,
  nextStatusActionLabel,
  type OrderStatus,
  type FulfillmentType,
} from "@/lib/notifications/status-updates";

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

/**
 * Guided order-status control for the admin orders table. Renders the status
 * badge + a compact progress stepper, a primary one-click button that advances
 * to the natural next step (delivery-type aware), and a collapsible override to
 * set any status (or cancel). Optimistic: the row updates instantly and reverts
 * on error.
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
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const lane = orderStatusLane(deliveryType);
  const currentIndex = lane.indexOf(status);
  const next = nextOrderStatus(status, deliveryType);

  function setTo(target: OrderStatus) {
    if (target === status) return;
    const previous = status;
    setError(null);
    setStatus(target); // optimistic
    setOverrideOpen(false);
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
      {/* Status + progress stepper */}
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

      {/* Advance + override */}
      <td className="py-4 pr-4">
        <div className="flex flex-col gap-1.5">
          {next ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setTo(next)}
              className="inline-flex items-center justify-center gap-1 rounded-md bg-brand px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {pending ? "Saving…" : nextStatusActionLabel(next, deliveryType)}
              {!pending ? (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : null}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 font-display text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {status === "delivered" ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Done
                </>
              ) : (
                "Cancelled"
              )}
            </span>
          )}

          <details
            open={overrideOpen}
            onToggle={(e) => setOverrideOpen(e.currentTarget.open)}
          >
            <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground">
              Set manually ▾
            </summary>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={pending || s === status}
                  onClick={() => setTo(s)}
                  className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-[0.1em] disabled:opacity-40 ${
                    s === "cancelled"
                      ? "border-flag-red/40 text-flag-red hover:bg-flag-red/10"
                      : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {ORDER_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </details>

          {error ? (
            <span role="status" className="text-[11px] text-flag-red">
              {error}
            </span>
          ) : null}
        </div>
      </td>
    </>
  );
}
