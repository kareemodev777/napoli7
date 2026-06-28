import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { countActionableOrders } from "./orders";

export interface AdminNotificationOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAed: number;
  createdAt: string;
}

export interface AdminNotificationMessage {
  id: string;
  name: string;
  preview: string;
  createdAt: string;
}

export interface AdminNotificationSnapshot {
  /** Orders the kitchen still needs to accept (received + paid/COD). */
  orders: number;
  /** Contact messages not yet opened by the admin. */
  messages: number;
  recentOrders: AdminNotificationOrder[];
  recentMessages: AdminNotificationMessage[];
}

export const EMPTY_SNAPSHOT: AdminNotificationSnapshot = {
  orders: 0,
  messages: 0,
  recentOrders: [],
  recentMessages: [],
};

/** Unread contact messages — null `read_at` means the admin hasn't opened it. */
export async function countUnreadMessages(): Promise<number> {
  if (!HAS_SUPABASE_SERVICE) return 0;
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    console.error("[admin/notifications] unread messages count failed:", error);
    return 0;
  }
  return count ?? 0;
}

/** Counts + a short recent list for the admin notification dropdown + badges. */
export async function getAdminNotificationSnapshot(): Promise<AdminNotificationSnapshot> {
  if (!HAS_SUPABASE_SERVICE) return EMPTY_SNAPSHOT;
  const supabase = createServiceRoleClient();

  const [orders, messages, recentOrdersRes, recentMessagesRes] =
    await Promise.all([
      countActionableOrders(),
      countUnreadMessages(),
      supabase
        .from("orders")
        .select("id, order_number, customer_name, total_aed, created_at")
        .eq("status", "received")
        .or("payment_method.eq.cod,payment_status.eq.paid")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("contact_messages")
        .select("id, name, message, created_at")
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  return {
    orders,
    messages,
    recentOrders: (recentOrdersRes.data ?? []).map((o) => ({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      totalAed: Number(o.total_aed),
      createdAt: o.created_at,
    })),
    recentMessages: (recentMessagesRes.data ?? []).map((m) => ({
      id: m.id,
      name: m.name,
      preview: String(m.message ?? "").slice(0, 90),
      createdAt: m.created_at,
    })),
  };
}
