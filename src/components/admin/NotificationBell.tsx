"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
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

/** Shared realtime state: the live count + a brief pulse on a fresh order. */
function useActionableOrders(initialCount: number) {
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

  return { count, pulse };
}

function statusLabel(count: number) {
  return count > 0
    ? `${count} order${count === 1 ? "" : "s"} to treat`
    : "No orders waiting";
}

/**
 * Admin notification surface, driven by Supabase Realtime (Postgres Changes on
 * the `orders` table). A new paid/COD order raises the actionable count, which
 * chimes + flashes and refreshes the queue.
 *
 * `panel` renders a full-width status pill for the wide sidebar; `compact`
 * renders the icon button for the mobile top bar.
 */
export function NotificationBell({
  initialCount,
  variant = "compact",
}: {
  initialCount: number;
  variant?: "compact" | "panel";
}) {
  const { count, pulse } = useActionableOrders(initialCount);
  const waiting = count > 0;
  const label = statusLabel(count);

  if (variant === "panel") {
    return (
      <Link
        href="/admin/orders"
        aria-label={label}
        className={`group flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors ${
          waiting
            ? "border-brand/30 bg-brand-soft hover:bg-brand-soft/70"
            : "border-border bg-card hover:bg-muted/60"
        }`}
      >
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
          {waiting ? (
            <span
              aria-hidden
              className={`absolute inset-0 rounded-md ${
                pulse ? "animate-ping bg-flag-red/40" : ""
              }`}
            />
          ) : null}
          <span
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-md ${
              waiting
                ? "bg-brand text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <Bell className="h-4 w-4" strokeWidth={1.8} aria-hidden />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={`block font-display text-sm uppercase tracking-[0.08em] tabular-nums ${
              waiting ? "text-brand-deep" : "text-foreground"
            }`}
          >
            {waiting ? `${count} to treat` : "All caught up"}
          </span>
          <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
            {waiting ? "Open the kitchen queue" : "No orders waiting"}
          </span>
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          strokeWidth={1.7}
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <Link
      href="/admin/orders"
      aria-label={label}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
    >
      {waiting && pulse ? (
        <span
          aria-hidden
          className="absolute inset-0 rounded-md bg-flag-red/30 animate-ping"
        />
      ) : null}
      <Bell
        className={`relative h-4 w-4 ${pulse ? "text-brand" : ""}`}
        strokeWidth={1.7}
        aria-hidden
      />
      {waiting ? (
        <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-display leading-[18px] tabular-nums text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
