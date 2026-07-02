/**
 * Pure helpers for order-status labelling and customer-facing change
 * notifications. Kept free of React / Supabase / env imports so the logic can
 * be unit tested and shared by both server and client code.
 */

export type OrderStatus =
  | "received"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type FulfillmentType = "delivery" | "pickup";

/** The ordered lane of statuses an order moves through, by fulfilment type. */
export function orderStatusLane(type: FulfillmentType): OrderStatus[] {
  return type === "delivery"
    ? ["received", "preparing", "out_for_delivery", "delivered"]
    : ["received", "preparing", "ready", "delivered"];
}

/** The natural next status to advance to, or null when terminal. */
export function nextOrderStatus(
  current: OrderStatus,
  type: FulfillmentType,
): OrderStatus | null {
  switch (current) {
    case "received":
      return "preparing";
    case "preparing":
      return type === "delivery" ? "out_for_delivery" : "ready";
    case "out_for_delivery":
    case "ready":
      return "delivered";
    default:
      return null; // delivered / cancelled are terminal
  }
}

/** Verb-first label for the button that advances TO `next`. */
export function nextStatusActionLabel(
  next: OrderStatus,
  type: FulfillmentType,
): string {
  switch (next) {
    case "preparing":
      return "Start preparing";
    case "ready":
      return "Mark ready for pickup";
    case "out_for_delivery":
      return "Out for delivery";
    case "delivered":
      return type === "delivery" ? "Mark delivered" : "Mark collected";
    default:
      return ORDER_STATUS_LABELS[next];
  }
}

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
