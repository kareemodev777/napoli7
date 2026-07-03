"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { markMessageRead } from "@/app/admin/messages/actions";
import { useAdminNotifications } from "@/components/admin/AdminNotificationsProvider";

/**
 * Per-message read control. Unread messages show a clickable "New" pill; tapping
 * it marks just that message read (decrementing the sidebar unread badge). Read
 * messages show a muted "Read".
 */
export function MessageReadCell({
  messageId,
  read,
}: {
  messageId: string;
  read: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  // The sidebar Messages/Customers badges live in this client provider, so a
  // plain router.refresh() (which re-renders the server tree) won't update them.
  // Re-fetch the notification snapshot directly so the badge drops immediately.
  const { refresh } = useAdminNotifications();

  if (read) {
    return (
      <span className="inline-flex items-center gap-1 font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        <Check className="h-3 w-3" strokeWidth={2} aria-hidden />
        Read
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await markMessageRead(messageId);
          refresh();
          router.refresh();
        })
      }
      aria-label="Mark message as read"
      className="inline-flex items-center rounded-full bg-brand px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover disabled:opacity-60"
    >
      {pending ? "…" : "New"}
    </button>
  );
}
