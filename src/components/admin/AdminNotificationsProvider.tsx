"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { playAlarm, unlockAlarm } from "./alarm";
import {
  EMPTY_SNAPSHOT,
  type AdminNotificationSnapshot,
} from "@/lib/admin/notifications";

// Realtime is the primary signal; the slow poll is a safety net for a dropped
// socket. The alarm re-fires on this cadence while orders await acceptance.
const FALLBACK_POLL_MS = 30_000;
const ALARM_REPEAT_MS = 4_000;

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

// Unique channel name per subscription so a re-mount never reuses an
// already-subscribed channel (which throws on a second `.on()`).
let channelSeq = 0;

interface AdminNotificationsContextValue {
  snapshot: AdminNotificationSnapshot;
  /** Brief flash when a fresh order arrives. */
  pulse: boolean;
  /** The admin muted the repeating alarm; a new order re-arms it. */
  silenced: boolean;
  silence: () => void;
  refresh: () => void;
}

const AdminNotificationsContext =
  createContext<AdminNotificationsContextValue | null>(null);

export function useAdminNotifications(): AdminNotificationsContextValue {
  const ctx = useContext(AdminNotificationsContext);
  // Defensive default so a stray consumer never crashes the admin shell.
  if (!ctx) {
    return {
      snapshot: EMPTY_SNAPSHOT,
      pulse: false,
      silenced: false,
      silence: () => {},
      refresh: () => {},
    };
  }
  return ctx;
}

export function AdminNotificationsProvider({
  initial,
  children,
}: {
  initial: AdminNotificationSnapshot;
  children: React.ReactNode;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [pulse, setPulse] = useState(false);
  const [silenced, setSilenced] = useState(false);
  const prevOrders = useRef(initial.orders);
  const refreshRef = useRef<() => void>(() => {});

  // Unlock audio on the admin's first interaction (browsers block autoplay).
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAlarm, { once: true });
    return () => window.removeEventListener("pointerdown", unlockAlarm);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      try {
        const res = await fetch("/api/admin/notifications", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as AdminNotificationSnapshot;
        if (cancelled || typeof data.orders !== "number") return;
        if (data.orders > prevOrders.current) {
          // A fresh order — flash and re-arm the alarm even if it was silenced.
          setPulse(true);
          setSilenced(false);
          window.setTimeout(() => setPulse(false), 2000);
        }
        prevOrders.current = data.orders;
        setSnapshot(data);
      } catch {
        // Keep the last snapshot; try again next tick.
      }
    }
    refreshRef.current = refresh;
    refresh();

    const supabase = SUPABASE_CONFIGURED ? getBrowserSupabase() : null;
    const channel = supabase
      ?.channel(`admin-notifications-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_messages" },
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

  // Continuous alarm: keep ringing while orders await acceptance, until the
  // queue is cleared (count -> 0) or the admin silences it. Keyed on the count
  // (a number) so it only re-arms when the count actually changes.
  useEffect(() => {
    if (snapshot.orders <= 0 || silenced) return;
    playAlarm();
    const id = window.setInterval(() => playAlarm(), ALARM_REPEAT_MS);
    return () => window.clearInterval(id);
  }, [snapshot.orders, silenced]);

  const value: AdminNotificationsContextValue = {
    snapshot,
    pulse,
    silenced,
    silence: () => setSilenced(true),
    refresh: () => refreshRef.current(),
  };

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}
