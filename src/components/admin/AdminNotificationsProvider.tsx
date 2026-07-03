"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { acknowledgeActionableOrders } from "@/app/admin/orders/ack-actions";
import { useAdminAlarm } from "@/store/admin-alarm";
import { startAlarm, stopAlarm, unlockAlarm } from "./alarm";
import {
  EMPTY_SNAPSHOT,
  type AdminNotificationSnapshot,
} from "@/lib/admin/notifications";

// Realtime is the primary signal; the slow poll is a safety net for a dropped
// socket.
const FALLBACK_POLL_MS = 30_000;

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
  const refreshRef = useRef<() => void>(() => {});

  // Acknowledge state lives in a global store so it survives navigation/re-mount.
  const silenced = useAdminAlarm((s) => s.silenced);

  // Being on the order queue counts as acknowledging the alert — so does
  // opening the notification dropdown (which calls silence()). Random clicks
  // elsewhere on the page do NOT stop the alarm.
  const pathname = usePathname();
  const onOrdersPage = pathname?.startsWith("/admin/orders") ?? false;

  // Acknowledge the current alert: silence instantly on the client AND stamp the
  // orders acknowledged in the DB so it stays silent across reloads/devices.
  // Re-fetch the snapshot so the durable count catches up right away.
  const acknowledge = useCallback(() => {
    useAdminAlarm.getState().silence();
    acknowledgeActionableOrders()
      .then(() => refreshRef.current())
      .catch((e) => console.error("[admin] acknowledge failed", e));
  }, []);

  // Visiting the orders page is a persistent acknowledge (not just while there),
  // so leaving it for the dashboard doesn't re-ring.
  useEffect(() => {
    if (onOrdersPage) acknowledge();
  }, [onOrdersPage, acknowledge]);

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
        // A rise in the count re-arms the alarm (in the global store) even if it
        // was silenced; flash the bell for the fresh order.
        if (useAdminAlarm.getState().reconcile(data.unacknowledgedOrders)) {
          setPulse(true);
          window.setTimeout(() => setPulse(false), 2000);
        }
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

  // Continuous alarm: loop the sound while orders await acceptance, and stop it
  // when the queue is cleared (count -> 0, i.e. the order was accepted), the
  // admin opens notifications, or they're on the orders page. A fresh order
  // re-arms it (silenced reset above).
  useEffect(() => {
    if (snapshot.unacknowledgedOrders > 0 && !silenced && !onOrdersPage) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [snapshot.unacknowledgedOrders, silenced, onOrdersPage]);

  const value: AdminNotificationsContextValue = {
    snapshot,
    pulse,
    silenced,
    silence: acknowledge,
    refresh: () => refreshRef.current(),
  };

  return (
    <AdminNotificationsContext.Provider value={value}>
      {children}
    </AdminNotificationsContext.Provider>
  );
}
