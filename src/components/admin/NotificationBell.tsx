"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const POLL_MS = 15_000;

/**
 * Admin notification bell. Polls the actionable-orders endpoint (Supabase
 * realtime needs anon RLS we don't expose on `orders`, so polling is the safe
 * choice) and shows a live badge of orders the kitchen still needs to treat.
 * Re-checks immediately whenever the admin navigates, and when the tab regains
 * focus, so a freshly treated order updates without waiting for the interval.
 */
export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [pulse, setPulse] = useState(false);
  const prevCount = useRef(initialCount);
  const pathname = usePathname();

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
          window.setTimeout(() => setPulse(false), 2000);
        }
        prevCount.current = data.count;
        setCount(data.count);
      } catch {
        // Network hiccup — keep the last known count and try again next tick.
      }
    }

    refresh();
    const id = window.setInterval(refresh, POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") refresh();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // Re-run on navigation so the count reflects actions just taken.
  }, [pathname]);

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
