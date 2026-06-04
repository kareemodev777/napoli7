/**
 * Derive a customer list from orders. There is no `customers` table — a
 * customer is the set of orders sharing a normalized email (or phone, when an
 * order has no email). This is pure and unit-tested; the admin page only feeds
 * it rows.
 */

export interface OrderForCustomer {
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_aed: number | string | null;
  created_at: string;
}

export interface DerivedCustomer {
  /** Stable grouping key (normalized email, else `phone:<digits>`). */
  key: string;
  name: string;
  email: string | null;
  phone: string | null;
  orderCount: number;
  totalSpentAed: number;
  firstOrderAt: string;
  lastOrderAt: string;
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

export function deriveCustomers(
  orders: OrderForCustomer[],
): DerivedCustomer[] {
  const map = new Map<string, DerivedCustomer>();

  for (const order of orders) {
    const key = groupKey(order);
    if (!key) continue;

    const amount = Number(order.total_aed ?? 0);
    const spent = Number.isFinite(amount) ? amount : 0;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        key,
        name: (order.customer_name ?? "").trim() || "—",
        email: normalizeEmail(order.customer_email),
        phone: order.customer_phone?.trim() || null,
        orderCount: 1,
        totalSpentAed: spent,
        firstOrderAt: order.created_at,
        lastOrderAt: order.created_at,
      });
      continue;
    }

    existing.orderCount += 1;
    existing.totalSpentAed += spent;
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

  return Array.from(map.values()).sort((a, b) =>
    a.lastOrderAt < b.lastOrderAt ? 1 : a.lastOrderAt > b.lastOrderAt ? -1 : 0,
  );
}
