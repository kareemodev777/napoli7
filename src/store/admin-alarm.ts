import { create } from "zustand";

/**
 * Global alarm-acknowledge state, kept OUTSIDE React so it survives navigation
 * and any re-mount of the admin notification provider. Component-local state
 * reset on route changes and re-armed the alarm on the dashboard — this fixes
 * that: once acknowledged, it stays silent until a genuinely new order arrives.
 */
interface AdminAlarmState {
  /** The admin has acknowledged the current alert (dropdown opened, or on the
   *  orders page). Stops the ringing until a new order arrives. */
  silenced: boolean;
  /** Highest actionable-order count reconciled so far — persistent so a
   *  navigation never mistakes the existing queue for a fresh order. */
  lastSeenOrders: number;
  /** Acknowledge the alert (stop ringing until a new order). */
  silence: () => void;
  /**
   * Reconcile a fresh actionable-order count. A rise above the last seen count
   * is a genuinely new order — it re-arms (un-silences) the alarm. Returns
   * whether it was new (for the visual pulse).
   */
  reconcile: (count: number) => boolean;
}

export const useAdminAlarm = create<AdminAlarmState>((set, get) => ({
  silenced: false,
  lastSeenOrders: 0,
  silence: () => set({ silenced: true }),
  reconcile: (count) => {
    const isNew = count > get().lastSeenOrders;
    set({ lastSeenOrders: count, silenced: isNew ? false : get().silenced });
    return isNew;
  },
}));
