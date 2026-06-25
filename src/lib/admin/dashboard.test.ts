import { describe, expect, test } from "bun:test";
import {
  buildDashboard,
  dashboardFetchStart,
  parseDashboardRange,
  type DashboardOrder,
} from "./dashboard";

// 2026-06-26 12:00 UTC = 16:00 Asia/Dubai.
const NOW = new Date("2026-06-26T12:00:00.000Z");

function order(partial: Partial<DashboardOrder>): DashboardOrder {
  return {
    created_at: NOW.toISOString(),
    total_aed: 40,
    status: "received",
    payment_method: "cod",
    payment_status: "unpaid",
    delivery_type: "delivery",
    order_items: [
      { product_name: "Margherita", quantity: 1, line_total_aed: 40 },
    ],
    ...partial,
  };
}

describe("parseDashboardRange", () => {
  test("defaults to 30d, accepts known ranges", () => {
    expect(parseDashboardRange(null)).toBe("30d");
    expect(parseDashboardRange("nope")).toBe("30d");
    expect(parseDashboardRange("today")).toBe("today");
    expect(parseDashboardRange("12mo")).toBe("12mo");
  });
});

describe("buildDashboard buckets", () => {
  test("today → 24 hourly buckets", () => {
    expect(buildDashboard([], "today", NOW).buckets).toHaveLength(24);
  });
  test("7d → 7, 30d → 30, 12mo → 12", () => {
    expect(buildDashboard([], "7d", NOW).buckets).toHaveLength(7);
    expect(buildDashboard([], "30d", NOW).buckets).toHaveLength(30);
    expect(buildDashboard([], "12mo", NOW).buckets).toHaveLength(12);
  });
});

describe("buildDashboard KPIs and deltas", () => {
  test("sums current-period sales and computes AOV", () => {
    const d = buildDashboard(
      [
        order({ total_aed: 40 }),
        order({ total_aed: 60, payment_method: "card", payment_status: "paid" }),
      ],
      "30d",
      NOW,
    );
    expect(d.sales.value).toBeCloseTo(100, 2);
    expect(d.orders.value).toBe(2);
    expect(d.avgOrder.value).toBeCloseTo(50, 2);
    expect(d.itemsSold.value).toBe(2);
  });

  test("delta compares current vs previous window", () => {
    // 100 now, 50 in the previous 30-day window → +100%.
    const prev = new Date(NOW.getTime() - 40 * 86_400_000).toISOString();
    const d = buildDashboard(
      [order({ total_aed: 100 }), order({ created_at: prev, total_aed: 50 })],
      "30d",
      NOW,
    );
    expect(d.sales.value).toBeCloseTo(100, 2);
    expect(d.sales.prev).toBeCloseTo(50, 2);
    expect(d.sales.deltaPct).toBeCloseTo(100, 1);
  });

  test("null delta when there's no prior baseline", () => {
    const d = buildDashboard([order({ total_aed: 40 })], "7d", NOW);
    expect(d.sales.deltaPct).toBeNull();
  });

  test("excludes cancelled and unpaid-card orders from revenue", () => {
    const d = buildDashboard(
      [
        order({ status: "cancelled" }),
        order({ payment_method: "card", payment_status: "failed" }),
      ],
      "30d",
      NOW,
    );
    expect(d.sales.value).toBe(0);
    expect(d.orders.value).toBe(0);
    // Status breakdown still counts every order placed.
    expect(d.statusBreakdown.reduce((s, r) => s + r.value, 0)).toBe(2);
  });
});

describe("buildDashboard breakdowns", () => {
  test("payment, delivery, and top products", () => {
    const d = buildDashboard(
      [
        order({ total_aed: 40, payment_method: "cod", delivery_type: "delivery" }),
        order({
          total_aed: 60,
          payment_method: "card",
          payment_status: "paid",
          delivery_type: "pickup",
          order_items: [
            { product_name: "Diavola", quantity: 2, line_total_aed: 60 },
          ],
        }),
      ],
      "30d",
      NOW,
    );
    expect(d.paymentBreakdown.find((r) => r.key === "card")?.value).toBeCloseTo(60, 2);
    expect(d.deliveryBreakdown.find((r) => r.key === "pickup")?.value).toBe(1);
    expect(d.topProducts[0]).toMatchObject({ name: "Diavola", quantity: 2 });
  });
});

describe("dashboardFetchStart", () => {
  test("reaches back two periods for comparison", () => {
    expect(dashboardFetchStart("30d", NOW).getTime()).toBeLessThan(
      NOW.getTime() - 30 * 86_400_000,
    );
  });
});
