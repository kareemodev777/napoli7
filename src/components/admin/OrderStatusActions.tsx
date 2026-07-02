"use client";

import { Popover } from "radix-ui";
import { ChevronRight, Check, ChevronDown } from "lucide-react";
import {
  ORDER_STATUS_LABELS,
  nextOrderStatus,
  nextStatusActionLabel,
  type OrderStatus,
  type FulfillmentType,
} from "@/lib/notifications/status-updates";

const ALL_STATUSES = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

const CONTENT = "z-50 rounded-md border border-border bg-card shadow-xl";

/** A trigger that opens a confirm popover before running its action. */
function ConfirmPopover({
  trigger,
  message,
  confirmLabel,
  onConfirm,
  danger,
}: {
  trigger: React.ReactNode;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={6} className={`${CONTENT} w-56 p-3`}>
          <p className="text-sm text-foreground">{message}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Popover.Close asChild>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-muted"
              >
                Back
              </button>
            </Popover.Close>
            <Popover.Close asChild>
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-md px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.14em] text-primary-foreground ${
                  danger ? "bg-flag-red hover:opacity-90" : "bg-brand hover:bg-brand-hover"
                }`}
              >
                {confirmLabel}
              </button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** The "set any status" override — an overlay popover menu so it never grows the row. */
function OverrideMenu({
  current,
  onSet,
  disabled,
  iconOnly,
}: {
  current: OrderStatus;
  onSet: (s: OrderStatus) => void;
  disabled: boolean;
  iconOnly?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          title="Change status"
          aria-label="Change status"
          className={
            iconOnly
              ? "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
              : "inline-flex items-center gap-0.5 rounded-md border border-border px-2 py-2 font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
          }
        >
          {!iconOnly ? "Change" : null}
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={6} className={`${CONTENT} w-44 p-1.5`}>
          {ALL_STATUSES.map((s) => (
            <Popover.Close asChild key={s}>
              <button
                type="button"
                disabled={s === current}
                onClick={() => onSet(s)}
                className={`block w-full rounded px-2 py-1.5 text-left font-display text-[11px] uppercase tracking-[0.1em] disabled:opacity-40 ${
                  s === "cancelled"
                    ? "text-flag-red hover:bg-flag-red/10"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {ORDER_STATUS_LABELS[s]}
              </button>
            </Popover.Close>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

/**
 * Guided status actions shared by the orders table and the detail page.
 * `compact` renders icon-only controls (a → advance arrow with a tooltip +
 * confirm popover, and a ▾ override menu) that sit inline on the status column
 * without growing the row; the full form shows labelled buttons for the panel.
 */
export function OrderStatusActions({
  status,
  deliveryType,
  pending,
  onSet,
  compact,
}: {
  status: OrderStatus;
  deliveryType: FulfillmentType;
  pending: boolean;
  onSet: (target: OrderStatus) => void;
  compact?: boolean;
}) {
  const next = nextOrderStatus(status, deliveryType);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1 align-middle">
        {next ? (
          <ConfirmPopover
            message={`Move this order to “${ORDER_STATUS_LABELS[next]}”?`}
            confirmLabel="Confirm"
            onConfirm={() => onSet(next)}
            trigger={
              <button
                type="button"
                disabled={pending}
                title={`Next: ${nextStatusActionLabel(next, deliveryType)}`}
                aria-label={`Next: ${nextStatusActionLabel(next, deliveryType)}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} aria-hidden />
              </button>
            }
          />
        ) : status === "delivered" ? (
          <Check
            className="h-4 w-4 text-flag-green"
            strokeWidth={2}
            aria-label="Completed"
          />
        ) : null}
        <OverrideMenu current={status} onSet={onSet} disabled={pending} iconOnly />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {next ? (
        <ConfirmPopover
          message={`Move this order to “${ORDER_STATUS_LABELS[next]}”?`}
          confirmLabel="Confirm"
          onConfirm={() => onSet(next)}
          trigger={
            <button
              type="button"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
            >
              {pending ? "Saving…" : nextStatusActionLabel(next, deliveryType)}
              {!pending ? (
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              ) : null}
            </button>
          }
        />
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

      {status !== "cancelled" && status !== "delivered" ? (
        <ConfirmPopover
          danger
          message="Cancel this order? This notifies the customer."
          confirmLabel="Yes, cancel"
          onConfirm={() => onSet("cancelled")}
          trigger={
            <button
              type="button"
              disabled={pending}
              className="rounded-md border border-flag-red/40 px-3 py-2 font-display text-[10px] uppercase tracking-[0.14em] text-flag-red hover:bg-flag-red/10 disabled:opacity-50"
            >
              Cancel
            </button>
          }
        />
      ) : null}

      <OverrideMenu current={status} onSet={onSet} disabled={pending} />
    </div>
  );
}
