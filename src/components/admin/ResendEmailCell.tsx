"use client";

import { useState, useTransition } from "react";
import { Popover } from "radix-ui";
import { RefreshCw } from "lucide-react";
import { resendContactEmail } from "@/app/admin/messages/actions";

/**
 * "Email" column for the admin Messages table: the delivered/not-sent badge
 * with a resend action (confirm popover), mirroring the POS sync cell. Resending
 * re-attempts the notification and updates the badge + error in place.
 */
export function ResendEmailCell({
  messageId,
  sent: initialSent,
  error: initialError,
}: {
  messageId: string;
  sent: boolean;
  error: string | null;
}) {
  const [sent, setSent] = useState(initialSent);
  const [error, setError] = useState<string | null>(initialError);
  const [open, setOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmResend() {
    setActionError(null);
    startTransition(async () => {
      const res = await resendContactEmail(messageId);
      if (res.sent) {
        setSent(true);
        setError(null);
        setOpen(false);
      } else {
        setSent(false);
        setError(res.error ?? null);
        setActionError(res.error ?? "Send failed.");
      }
    });
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Popover.Root
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setActionError(null);
          }}
        >
          <Popover.Trigger asChild>
            <button
              type="button"
              aria-label="Resend email"
              title="Resend email"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
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
              <p className="font-medium">Resend email?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Re-send this contact notification to the kitchen inbox.
              </p>
              {actionError ? (
                <p className="mt-2 text-xs text-flag-red">{actionError}</p>
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
                  onClick={confirmResend}
                  disabled={pending}
                  className="inline-flex items-center bg-brand px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
                >
                  {pending ? "Sending…" : "Resend"}
                </button>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>

        <span
          className={
            "inline-flex items-center whitespace-nowrap px-2.5 py-1 font-display text-[10px] tracking-[0.16em] uppercase " +
            (sent
              ? "bg-flag-green/15 text-flag-green"
              : "bg-flag-red/10 text-flag-red")
          }
        >
          {sent ? "Sent" : "Not sent"}
        </span>
      </div>
      {!sent && error ? (
        <p className="max-w-[220px] text-[11px] leading-4 text-muted-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
