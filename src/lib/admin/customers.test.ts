import { describe, expect, test } from "bun:test";
import {
  deriveCustomers,
  normalizeEmail,
  normalizePhone,
  type OrderForCustomer,
} from "./customers";

function order(partial: Partial<OrderForCustomer>): OrderForCustomer {
  return {
    customer_name: "Guest",
    customer_email: null,
    customer_phone: null,
    total_aed: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("normalizeEmail / normalizePhone", () => {
  test("lowercases and trims email, null when empty", () => {
    expect(normalizeEmail("  Foo@Bar.com ")).toBe("foo@bar.com");
    expect(normalizeEmail("   ")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  test("strips non-digits from phone", () => {
    expect(normalizePhone("+971 50 162 8577")).toBe("971501628577");
    expect(normalizePhone("")).toBeNull();
  });
});

describe("deriveCustomers", () => {
  test("groups orders by normalized email", () => {
    const customers = deriveCustomers([
      order({
        customer_name: "Abdul",
        customer_email: "AK@example.com",
        customer_phone: "+971500000001",
        total_aed: 50,
        created_at: "2026-02-01T10:00:00.000Z",
      }),
      order({
        customer_name: "Abdul Kareem",
        customer_email: "ak@example.com",
        customer_phone: "+971500000002",
        total_aed: "30.50",
        created_at: "2026-03-01T10:00:00.000Z",
      }),
    ]);

    expect(customers).toHaveLength(1);
    const c = customers[0];
    expect(c.orderCount).toBe(2);
    expect(c.totalSpentAed).toBeCloseTo(80.5, 2);
    expect(c.email).toBe("ak@example.com");
    // Most recent order supplies display name + phone.
    expect(c.name).toBe("Abdul Kareem");
    expect(c.phone).toBe("+971500000002");
    expect(c.firstOrderAt).toBe("2026-02-01T10:00:00.000Z");
    expect(c.lastOrderAt).toBe("2026-03-01T10:00:00.000Z");
  });

  test("falls back to phone when an order has no email", () => {
    const customers = deriveCustomers([
      order({ customer_email: null, customer_phone: "050 111 2233", total_aed: 20 }),
      order({ customer_email: "  ", customer_phone: "0501112233", total_aed: 10 }),
    ]);
    expect(customers).toHaveLength(1);
    expect(customers[0].orderCount).toBe(2);
    expect(customers[0].key).toBe("phone:0501112233");
  });

  test("skips orders with neither email nor phone", () => {
    expect(
      deriveCustomers([order({ customer_email: null, customer_phone: null })]),
    ).toHaveLength(0);
  });

  test("sorts customers by most recent order first", () => {
    const customers = deriveCustomers([
      order({ customer_email: "old@x.com", created_at: "2026-01-01T00:00:00.000Z" }),
      order({ customer_email: "new@x.com", created_at: "2026-05-01T00:00:00.000Z" }),
    ]);
    expect(customers.map((c) => c.email)).toEqual(["new@x.com", "old@x.com"]);
  });
});
