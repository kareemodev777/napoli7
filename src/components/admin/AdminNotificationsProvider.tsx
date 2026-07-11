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
  shouldRingOrderAlarm,
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

  // The alarm rings while ANY order is still RECEIVED, and stops only when the
  // last one leaves that status — i.e. when the kitchen actually accepts it
  // (PREPARING) or it is CANCELLED. Pickup orders included; `snapshot.orders`
  // counts every received order regardless of fulfilment type.
  //
  // It used to key off "unacknowledged", and to treat looking at the queue as
  // acknowledging it — opening /admin/orders silenced the alarm and stamped the
  // orders acknowledged in the database, permanently. So the sound stopped when
  // someone glanced at the screen rather than when anyone cooked the pizza, which
  // is precisely backwards: the alarm exists to survive being noticed. Seeing an
  // order is not accepting it, and only accepting it stops the ringing.
  useEffect(() => {
    if (shouldRingOrderAlarm(snapshot)) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [snapshot]);

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
