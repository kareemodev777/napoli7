"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { playAlarm, unlockAlarm } from "./alarm";

// Realtime is the primary signal; this slow poll is only a safety net in case
// the websocket drops (sleep/wake, flaky network).
const FALLBACK_POLL_MS = 30_000;

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Unique channel name per subscription so a re-mount never reuses an
// already-subscribed channel (which throws on a second `.on()`).
let channelSeq = 0;

/**
 * Admin notification bell, driven by Supabase Realtime (Postgres Changes on the
 * `orders` table). When an order is inserted or updated it re-reads the
 * admin-gated actionable count: a higher count means a new paid/COD order, so it
 * chimes + pulses, and refreshes the current route so the orders table updates
 * live. A slow poll + tab-focus check back it up if the socket drops.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(initialCount);

  // Browsers block audio until the user interacts with the page, so unlock the
  // shared AudioContext on the admin's first click/tap.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAlarm, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAlarm);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/admin/actionable-orders", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (cancelled || typeof data.count !== "number") return;
        if (data.count > prevCount.current) {
          setPulse(true);
          playAlarm();
          window.setTimeout(() => setPulse(false), 2000);
        }
        prevCount.current = data.count;
        setCount(data.count);
      } catch {
        // Network hiccup — keep the last known count and try again next tick.
      }
    }

    refresh();

    // Live updates: any insert/update on orders triggers a re-check.
    const supabase = SUPABASE_CONFIGURED ? getBrowserSupabase() : null;
    const channel = supabase
      ?.channel(`admin-orders-bell-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refresh(),
      )
      .subscribe();

    const id = window.setInterval(refresh, FALLBACK_POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase?.removeChannel(channel);
    };
  }, []);

  const label =
    count > 0
      ? `${count} order${count === 1 ? "" : "s"} to treat`
      : "No orders waiting";

  return (
    <Link
      href="/admin/orders"
      aria-label={label}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
    >
      <Bell
        className={`h-4 w-4 ${pulse ? "animate-pulse text-brand" : ""}`}
        strokeWidth={1.7}
        aria-hidden
      />
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-display leading-[18px] tabular-nums text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
