"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const POLL_MS = 15_000;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext
  );
}

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
  const audioCtx = useRef<AudioContext | null>(null);
  const pathname = usePathname();

  // Browsers block audio until the user interacts with the page, so unlock (and
  // lazily create) the AudioContext on the admin's first click/tap.
  useEffect(() => {
    function unlock() {
      try {
        const Ctor = getAudioContextCtor();
        if (Ctor && !audioCtx.current) audioCtx.current = new Ctor();
        void audioCtx.current?.resume();
      } catch {
        // Audio is best-effort — ignore unlock failures.
      }
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // A short two-tone chime (Web Audio, no asset) plus a vibration on mobile, so
  // a new order is heard even when the admin isn't looking at the screen.
  function playAlert() {
    try {
      const Ctor = getAudioContextCtor();
      if (!Ctor) return;
      const ctx = audioCtx.current ?? new Ctor();
      audioCtx.current = ctx;
      if (ctx.state === "suspended") void ctx.resume();
      const start = ctx.currentTime;
      [
        { at: 0, freq: 880 },
        { at: 0.18, freq: 1175 },
      ].forEach(({ at, freq }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start + at);
        gain.gain.exponentialRampToValueAtTime(0.35, start + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start + at);
        osc.stop(start + at + 0.16);
      });
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      // Never let an audio failure break the bell.
    }
  }

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
          playAlert();
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
