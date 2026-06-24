"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { retryFailedPosPushes } from "@/app/admin/pos/actions";

/** Re-send every order stuck in `failed` to the POS, in one click. */
export function RetryPosButton({ failedCount }: { failedCount: number }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClick() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await retryFailedPosPushes();
      if (res.error) {
        setError(res.error);
        return;
      }
      setMessage(
        res.replayed === 0
          ? "Nothing to retry."
          : `Re-sent ${res.replayed} order${res.replayed === 1 ? "" : "s"}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || failedCount === 0}
        className="inline-flex items-center border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending
          ? "Retrying…"
          : `Retry failed${failedCount > 0 ? ` (${failedCount})` : ""}`}
      </button>
      {message ? (
        <span className="text-[11px] text-muted-foreground">{message}</span>
      ) : null}
      {error ? <span className="text-[11px] text-flag-red">{error}</span> : null}
    </div>
  );
}
