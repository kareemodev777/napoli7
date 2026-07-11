import { describe, expect, test } from "bun:test";
import { EMPTY_SNAPSHOT, shouldRingOrderAlarm } from "./notifications";

// `orders` counts orders still in RECEIVED. The alarm follows that count and
// nothing else — accepting the order is what stops it, not noticing it.
describe("new-order alarm", () => {
  const withReceived = (n: number) => ({ ...EMPTY_SNAPSHOT, orders: n });

  test("rings while an order is still RECEIVED", () => {
    expect(shouldRingOrderAlarm(withReceived(1))).toBe(true);
    expect(shouldRingOrderAlarm(withReceived(5))).toBe(true);
  });

  test("stops once no order is RECEIVED (accepted or cancelled)", () => {
    expect(shouldRingOrderAlarm(withReceived(0))).toBe(false);
  });

  // The reported bug. Opening the Live Orders page used to acknowledge every
  // order and silence the alarm, so it stopped when someone looked at the screen
  // rather than when anyone started cooking.
  test("acknowledging does NOT silence it — only the status change does", () => {
    const seenButNotAccepted = {
      ...EMPTY_SNAPSHOT,
      orders: 1, // still RECEIVED
      unacknowledgedOrders: 0, // admin has looked at the queue
    };
    expect(shouldRingOrderAlarm(seenButNotAccepted)).toBe(true);
  });
});
