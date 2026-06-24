"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const FALLBACK_POLL_MS = 30_000;

// Unique channel name per mount so a re-mount never reuses an already-subscribed
// channel (which throws on a second `.on()`).
let channelSeq = 0;

/**
 * Keeps the admin orders table live via Supabase Realtime: any insert/update on
 * `orders` re-fetches the server-rendered table (router.refresh()), so new
 * orders and status/POS changes appear without a manual reload. A slow poll
 * backs it up if the socket drops. The new-order chime is owned by the
 * NotificationBell, so this stays silent.
 */
export function OrdersAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = SUPABASE_CONFIGURED ? getBrowserSupabase() : null;
    const channel = supabase
      ?.channel(`admin-orders-table-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => router.refresh(),
      )
      .subscribe();

    const id = window.setInterval(() => router.refresh(), FALLBACK_POLL_MS);
    return () => {
      window.clearInterval(id);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [router]);

  return null;
}
