/**
 * Derive a customer list from orders. There is no `customers` table — a
 * customer is the set of orders sharing a normalized email (or phone, when an
 * order has no email). This is pure and unit-tested; the admin page only feeds
 * it rows.
 *
 * "Registered vs guest" is decided two ways: an order carrying a `user_id`
 * means that order was placed while signed in, and an email present in the
 * `registeredEmails` set (sourced from `auth.users`) means an account exists
 * for that address even if every order was a guest checkout.
 */

export interface OrderForCustomer {
  id: string;
  order_number: string | null;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_aed: number | string | null;
  status: string | null;
  payment_method: string | null;
  payment_status: string | null;
  created_at: string;
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string | null;
  totalAed: number;
  status: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  createdAt: string;
}

export interface DerivedCustomer {
  /** Stable grouping key (normalized email, else `phone:<digits>`). */
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  /** True when an account exists for this customer (signed-in order or known auth email). */
  isRegistered: boolean;
  orderCount: number;
  totalSpentAed: number;
  firstOrderAt: string;
  lastOrderAt: string;
  /** Individual orders, newest first, for the expandable detail view. */
  orders: CustomerOrderSummary[];
}

export function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = (email ?? "").trim().toLowerCase();
  return trimmed || null;
}

export function normalizePhone(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/[^0-9]/g, "");
  return digits || null;
}

function groupKey(order: OrderForCustomer): string | null {
  const email = normalizeEmail(order.customer_email);
  if (email) return `email:${email}`;
  const phone = normalizePhone(order.customer_phone);
  if (phone) return `phone:${phone}`;
  return null;
}

function toSummary(order: OrderForCustomer, spent: number): CustomerOrderSummary {
  return {
    id: order.id,
    orderNumber: order.order_number,
    totalAed: spent,
    status: order.status,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    createdAt: order.created_at,
  };
}

export function deriveCustomers(
  orders: OrderForCustomer[],
  registeredEmails: Set<string> = new Set(),
): DerivedCustomer[] {
  const map = new Map<string, DerivedCustomer>();

  for (const order of orders) {
    const key = groupKey(order);
    if (!key) continue;

    const amount = Number(order.total_aed ?? 0);
    const spent = Number.isFinite(amount) ? amount : 0;
    const email = normalizeEmail(order.customer_email);
    const registered =
      Boolean(order.user_id) || (email !== null && registeredEmails.has(email));
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        name: (order.customer_name ?? "").trim() || "—",
        email,
        phone: order.customer_phone?.trim() || null,
        isRegistered: registered,
        orderCount: 1,
        totalSpentAed: spent,
        firstOrderAt: order.created_at,
        lastOrderAt: order.created_at,
        orders: [toSummary(order, spent)],
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpentAed += spent;
    existing.isRegistered = existing.isRegistered || registered;
    existing.orders.push(toSummary(order, spent));
    if (order.created_at < existing.firstOrderAt) {
      existing.firstOrderAt = order.created_at;
    }
    if (order.created_at > existing.lastOrderAt) {
      // The most recent order wins for display fields, since a customer's
      // latest name/phone is the freshest contact info.
      existing.lastOrderAt = order.created_at;
      existing.name = (order.customer_name ?? "").trim() || existing.name;
      existing.phone = order.customer_phone?.trim() || existing.phone;
    }
  }

  for (const customer of map.values()) {
    customer.orders.sort((a, b) =>
      a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0,
    );
  }

  return Array.from(map.values()).sort((a, b) =>
    a.lastOrderAt < b.lastOrderAt ? 1 : a.lastOrderAt > b.lastOrderAt ? -1 : 0,
  );
}
