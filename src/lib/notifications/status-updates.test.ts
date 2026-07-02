import { describe, expect, test } from "bun:test";
import {
  diffOrderStatuses,
  nextOrderStatus,
  orderStatusLane,
  statusChangeMessage,
  statusLabel,
  type OrderStatusSnapshot,
} from "./status-updates";

describe("statusLabel", () => {
  test("maps known statuses to human labels", () => {
    expect(statusLabel("received")).toBe("Received");
    expect(statusLabel("out_for_delivery")).toBe("Out for delivery");
    expect(statusLabel("cancelled")).toBe("Cancelled");
  });

  test("falls back to the raw value for unknown statuses", () => {
    expect(statusLabel("on_hold")).toBe("on_hold");
  });
});

describe("statusChangeMessage", () => {
  test("includes the order number and the human label", () => {
    expect(statusChangeMessage("N7-00042", "preparing")).toBe(
      "Order N7-00042 changed to Preparing",
    );
  });

  test("uses the fallback label for unknown statuses", () => {
    expect(statusChangeMessage("N7-00042", "weird")).toBe(
      "Order N7-00042 changed to weird",
    );
  });
});

describe("diffOrderStatuses", () => {
  const base: OrderStatusSnapshot[] = [
    { id: "a", orderNumber: "N7-1", status: "received" },
    { id: "b", orderNumber: "N7-2", status: "preparing" },
  ];

  test("returns no changes when nothing differs", () => {
    expect(diffOrderStatuses(base, base)).toEqual([]);
  });

  test("reports one change entry per order whose status differs", () => {
    const next: OrderStatusSnapshot[] = [
      { id: "a", orderNumber: "N7-1", status: "preparing" },
      { id: "b", orderNumber: "N7-2", status: "preparing" },
    ];
    const changes = diffOrderStatuses(base, next);
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      id: "a",
      orderNumber: "N7-1",
      status: "preparing",
      message: "Order N7-1 changed to Preparing",
    });
  });

  test("reports changes for multiple orders at once", () => {
    const next: OrderStatusSnapshot[] = [
      { id: "a", orderNumber: "N7-1", status: "out_for_delivery" },
      { id: "b", orderNumber: "N7-2", status: "delivered" },
    ];
    const changes = diffOrderStatuses(base, next);
    expect(changes.map((c) => c.id)).toEqual(["a", "b"]);
    expect(changes.map((c) => c.status)).toEqual([
      "out_for_delivery",
      "delivered",
    ]);
  });

  test("treats orders absent from the previous snapshot as unchanged", () => {
    const next: OrderStatusSnapshot[] = [
      ...base,
      { id: "c", orderNumber: "N7-3", status: "delivered" },
    ];
    expect(diffOrderStatuses(base, next)).toEqual([]);
  });

  test("ignores orders that disappear from the next snapshot", () => {
    const next: OrderStatusSnapshot[] = [
      { id: "a", orderNumber: "N7-1", status: "received" },
    ];
    expect(diffOrderStatuses(base, next)).toEqual([]);
  });
});

describe("order status workflow lanes", () => {
  test("delivery lane advances received → preparing → out_for_delivery → delivered", () => {
    expect(orderStatusLane("delivery")).toEqual([
      "received",
      "preparing",
      "out_for_delivery",
      "delivered",
    ]);
    expect(nextOrderStatus("received", "delivery")).toBe("preparing");
    expect(nextOrderStatus("preparing", "delivery")).toBe("out_for_delivery");
    expect(nextOrderStatus("out_for_delivery", "delivery")).toBe("delivered");
    expect(nextOrderStatus("delivered", "delivery")).toBeNull();
  });

  test("pickup lane advances received → preparing → ready → delivered", () => {
    expect(orderStatusLane("pickup")).toEqual([
      "received",
      "preparing",
      "ready",
      "delivered",
    ]);
    expect(nextOrderStatus("preparing", "pickup")).toBe("ready");
    expect(nextOrderStatus("ready", "pickup")).toBe("delivered");
  });

  test("cancelled is terminal", () => {
    expect(nextOrderStatus("cancelled", "delivery")).toBeNull();
    expect(nextOrderStatus("cancelled", "pickup")).toBeNull();
  });
});
