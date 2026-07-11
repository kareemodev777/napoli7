import { describe, expect, test } from "bun:test";
import { riderAssignmentMessage } from "./whatsapp";

// The rider's brief is the one message that has to be right — they act on it in
// traffic. It must carry a tappable map link and say plainly whether to collect
// cash, whichever channel it goes out on.
describe("riderAssignmentMessage", () => {
  const base = {
    riderName: "Ali",
    riderPhone: "+971509833501",
    orderNumber: "N7-00042",
    customerName: "Marco",
    customerPhone: "+971501112222",
    deliveryType: "delivery" as const,
    deliverySlot: "ASAP",
    paymentMethod: "cod",
    paymentStatus: "pending",
    totalAed: 52,
    items: [{ name: "Margherita", quantity: 2 }],
  };

  test("a COD rider is told to collect the cash, and how much", () => {
    const msg = riderAssignmentMessage({
      ...base,
      deliveryAddress: { street: "Sheikh Rashid St", area: "Al Jurf", lat: 25.4, lng: 55.5 },
    });
    expect(msg).toContain("Collect on delivery: 52.00 AED");
    expect(msg).toContain("N7-00042");
    expect(msg).toContain("Marco");
    expect(msg).toContain("2× Margherita");
  });

  test("a prepaid rider is told to collect NOTHING", () => {
    const msg = riderAssignmentMessage({
      ...base,
      paymentMethod: "card",
      paymentStatus: "paid",
      deliveryAddress: { street: "Sheikh Rashid St", area: "Al Jurf" },
    });
    expect(msg).toContain("collect nothing");
    expect(msg).not.toContain("Collect on delivery");
  });

  test("a dropped pin becomes a tappable maps link", () => {
    const msg = riderAssignmentMessage({
      ...base,
      deliveryAddress: { street: "Somewhere", area: "Al Jurf", lat: 25.4002, lng: 55.5033 },
    });
    expect(msg).toContain("Map: https://www.google.com/maps/search/?api=1&query=25.4002,55.5033");
  });
});
