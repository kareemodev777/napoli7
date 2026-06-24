"use client";

import { useState, useTransition } from "react";
import { syncOrderToPos } from "@/app/admin/pos/actions";

const TAG: Record<string, { label: string; classes: string }> = {
  sent: { label: "Synced", classes: "bg-flag-green/15 text-flag-green" },
  failed: { label: "Failed", classes: "bg-flag-red/10 text-flag-red" },
  pending: { label: "Pending", classes: "bg-muted text-muted-foreground" },
};

/**
 * Admin control to (re)push a single order to the POS. Disabled for orders that
 * can't be sent (unpaid card / cancelled) with an explanatory note.
 */
export function SyncPosButton({
  orderId,
  initialStatus,
  payable,
}: {
  orderId: string;
  initialStatus: string;
  payable: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tag = TAG[status] ?? TAG.pending;

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await syncOrderToPos(orderId);
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.status) setStatus(res.status);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-3">
        <span
          className={
            "inline-flex items-center whitespace-nowrap px-2.5 py-1 font-display text-[10px] tracking-[0.16em] uppercase " +
            tag.classes
          }
        >
          {tag.label}
        </span>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending || !payable}
          className="inline-flex items-center border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? "Sending…" : status === "sent" ? "Re-sync POS" : "Sync to POS"}
        </button>
      </div>
      {!payable ? (
        <p className="text-[11px] text-muted-foreground">
          Available once the order is paid (card) or COD.
        </p>
      ) : null}
      {error ? <p className="text-[11px] text-flag-red">{error}</p> : null}
    </div>
  );
}
