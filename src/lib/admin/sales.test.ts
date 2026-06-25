import { describe, expect, test } from "bun:test";
import {
  buildSalesSeries,
  parseSalesRange,
  salesWindowStart,
  type SalesOrder,
} from "./sales";

// Anchor "now" to a fixed instant so bucket boundaries are deterministic.
// 2026-06-26 12:00 UTC = 16:00 Asia/Dubai.
const NOW = new Date("2026-06-26T12:00:00.000Z");

function sale(partial: Partial<SalesOrder>): SalesOrder {
  return {
    created_at: NOW.toISOString(),
    total_aed: 40,
    status: "received",
    payment_method: "cod",
    payment_status: "unpaid",
    ...partial,
  };
}

describe("parseSalesRange", () => {
  test("defaults to week, accepts month/year", () => {
    expect(parseSalesRange(null)).toBe("week");
    expect(parseSalesRange("bogus")).toBe("week");
    expect(parseSalesRange("month")).toBe("month");
    expect(parseSalesRange("year")).toBe("year");
  });
});

describe("buildSalesSeries", () => {
  test("week has 7 daily buckets, today last", () => {
    const s = buildSalesSeries([], "week", NOW);
    expect(s.buckets).toHaveLength(7);
    expect(s.buckets.at(-1)?.key).toBe("2026-06-26");
    expect(s.totalRevenue).toBe(0);
  });

  test("month has 30 buckets, year has 12 months", () => {
    expect(buildSalesSeries([], "month", NOW).buckets).toHaveLength(30);
    const year = buildSalesSeries([], "year", NOW);
    expect(year.buckets).toHaveLength(12);
    expect(year.buckets.at(-1)?.key).toBe("2026-06");
  });

  test("sums cod + paid revenue into the right day", () => {
    const s = buildSalesSeries(
      [
        sale({ total_aed: 40, payment_method: "cod" }),
        sale({ total_aed: "55.5", payment_method: "card", payment_status: "paid" }),
      ],
      "week",
      NOW,
    );
    const today = s.buckets.at(-1);
    expect(today?.orders).toBe(2);
    expect(today?.revenue).toBeCloseTo(95.5, 2);
    expect(s.totalRevenue).toBeCloseTo(95.5, 2);
  });

  test("excludes cancelled and unpaid card orders", () => {
    const s = buildSalesSeries(
      [
        sale({ status: "cancelled", payment_method: "cod" }),
        sale({ payment_method: "card", payment_status: "failed" }),
      ],
      "week",
      NOW,
    );
    expect(s.totalRevenue).toBe(0);
    expect(s.totalOrders).toBe(0);
  });

  test("drops orders outside the window", () => {
    const s = buildSalesSeries(
      [sale({ created_at: "2020-01-01T00:00:00.000Z" })],
      "week",
      NOW,
    );
    expect(s.totalOrders).toBe(0);
  });
});

describe("salesWindowStart", () => {
  test("reaches further back for wider ranges", () => {
    expect(salesWindowStart("week", NOW).getTime()).toBeLessThan(NOW.getTime());
    expect(salesWindowStart("year", NOW).getTime()).toBeLessThan(
      salesWindowStart("month", NOW).getTime(),
    );
  });
});
