/**
 * Pure helpers for order-status labelling and customer-facing change
 * notifications. Kept free of React / Supabase / env imports so the logic can
 * be unit tested and shared by both server and client code.
 */

export type OrderStatus =
  | "received"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Human-readable label for a status. Falls back to the raw value if unknown. */
export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

/**
 * Customer-facing message announcing a status change, e.g.
 * `Order N7-00042 changed to Preparing`.
 */
export function statusChangeMessage(
  orderNumber: string,
  status: string,
): string {
  return `Order ${orderNumber} changed to ${statusLabel(status)}`;
}

export interface OrderStatusSnapshot {
  id: string;
  orderNumber: string;
  status: OrderStatus;
}

export interface OrderStatusChange extends OrderStatusSnapshot {
  message: string;
}

/**
 * Diff two status snapshots (keyed by order id) and return one change entry per
 * order whose status differs from the previous snapshot. Orders absent from the
 * previous snapshot are treated as unchanged (newly visible, not "changed").
 */
export function diffOrderStatuses(
  previous: OrderStatusSnapshot[],
  next: OrderStatusSnapshot[],
): OrderStatusChange[] {
  const prevById = new Map(previous.map((o) => [o.id, o.status]));
  const changes: OrderStatusChange[] = [];
  for (const order of next) {
    const before = prevById.get(order.id);
    if (before !== undefined && before !== order.status) {
      changes.push({
        ...order,
        message: statusChangeMessage(order.orderNumber, order.status),
      });
    }
  }
  return changes;
}
