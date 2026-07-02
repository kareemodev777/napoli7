"use client";

import { useState, useTransition } from "react";
import { Popover } from "radix-ui";
import { RefreshCw } from "lucide-react";
import { syncOrderToPos } from "@/app/admin/pos/actions";

const TAG: Record<string, { label: string; classes: string }> = {
  sent: { label: "Synced", classes: "bg-flag-green/15 text-flag-green" },
  failed: { label: "Failed", classes: "bg-flag-red/10 text-flag-red" },
  pending: { label: "Pending", classes: "bg-muted text-muted-foreground" },
};

/**
 * POS column for the admin orders table: a sync action (with a confirm popover)
 * sitting before the status badge. Disabled for orders that can't be pushed
 * (unpaid card / cancelled). Confirming pushes the order and updates the badge
 * in place.
 */
export function PosSyncCell({
  orderId,
  status: initialStatus,
  invoiceNumber,
  payable,
}: {
  orderId: string;
  status: string;
  /** POS-assigned invoice number (e.g. "INV-46"), shown once synced. */
  invoiceNumber?: string | null;
  payable: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tag = TAG[status] ?? TAG.pending;

  function confirmSync() {
    setError(null);
    startTransition(async () => {
      const res = await syncOrderToPos(orderId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.status) setStatus(res.status);
      setOpen(false);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <Popover.Trigger asChild>
          <button
            type="button"
            disabled={!payable}
            aria-label="Sync to POS"
            title={payable ? "Sync to POS" : "Available once paid (card) or COD"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="start"
            sideOffset={6}
            className="z-50 w-60 rounded-md border border-border bg-card p-3 text-sm shadow-md"
          >
            <p className="font-medium">
              {status === "sent" ? "Re-sync to POS?" : "Sync to POS?"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Push this order to the POS (xtbooks).
            </p>
            {error ? (
              <p className="mt-2 text-xs text-flag-red">{error}</p>
            ) : null}
            <div className="mt-3 flex justify-end gap-2">
              <Popover.Close asChild>
                <button
                  type="button"
                  className="inline-flex items-center border border-border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] hover:bg-muted"
                >
                  Cancel
                </button>
              </Popover.Close>
              <button
                type="button"
                onClick={confirmSync}
                disabled={pending}
                className="inline-flex items-center bg-brand px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
              >
                {pending ? "Syncing…" : status === "sent" ? "Re-sync" : "Sync"}
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <span
        className={
          "inline-flex items-center whitespace-nowrap px-2.5 py-1 font-display text-[10px] tracking-[0.16em] uppercase " +
          tag.classes
        }
      >
        {tag.label}
      </span>
      </div>
      {invoiceNumber ? (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {invoiceNumber}
        </span>
      ) : null}
    </div>
  );
}
