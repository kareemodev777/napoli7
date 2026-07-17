"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markAllMessagesRead } from "@/app/admin/messages/actions";
import { useAdminNotifications } from "@/components/admin/AdminNotificationsProvider";

/**
 * Opening the Messages inbox marks everything read, so the unread badge clears
 * without the admin having to click each "New" pill. Runs once per mount; only
 * refreshes the badge/page when something was actually marked read.
 *
 * `unreadCount` is the server-rendered count for this page load — we skip the
 * round-trip entirely when the inbox is already clear.
 */
export function MarkMessagesReadOnView({
  unreadCount,
}: {
  unreadCount: number;
}) {
  const router = useRouter();
  const { refresh } = useAdminNotifications();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || unreadCount === 0) return;
    done.current = true;
    let alive = true;
    void (async () => {
      const marked = await markAllMessagesRead();
      if (!alive || marked === 0) return;
      // The badges live in the notifications provider (a plain router.refresh
      // won't touch them), so refetch the snapshot, then re-render the table.
      refresh();
      router.refresh();
    })();
    return () => {
      alive = false;
    };
  }, [unreadCount, refresh, router]);

  return null;
}
