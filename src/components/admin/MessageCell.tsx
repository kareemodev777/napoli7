"use client";

import { AdminModal } from "@/components/admin/AdminModal";

/** A message longer than this (or spanning several lines) gets clamped in the
 *  table, with a "See more" trigger that opens the full text in a dialog. */
const PREVIEW_CHARS = 140;

export function MessageCell({
  message,
  from,
}: {
  message: string;
  /** Sender line shown as the dialog subtitle (e.g. "Jane · jane@x.com"). */
  from: string;
}) {
  const needsModal =
    message.length > PREVIEW_CHARS || message.split("\n").length > 2;

  return (
    <div className="max-w-md">
      <p className="line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed">
        {message}
      </p>
      {needsModal ? (
        <AdminModal
          trigger="See more"
          triggerLabel="View full message"
          triggerClassName="mt-1 font-display text-[10px] uppercase tracking-[0.16em] text-azure-deep hover:underline"
          title="Message"
          description={from}
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {message}
          </p>
        </AdminModal>
      ) : null}
    </div>
  );
}
