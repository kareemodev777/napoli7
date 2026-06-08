import { test, expect, describe } from "bun:test";
import {
  orderRowToWooOrder,
  statusToWooUpdate,
  siteStatusToWoo,
  splitName,
  type PosOrderRow,
} from "./payload";

function baseRow(overrides: Partial<PosOrderRow> = {}): PosOrderRow {
  return {
    id: "uuid-1",
    order_number: "N7-00042",
    status: "received",
    customer_name: "John Doe",
    customer_phone: "+971501234567",
    customer_email: "john@example.com",
    delivery_type: "pickup",
    delivery_address: null,
    delivery_slot: "ASAP",
    order_notes: null,
    payment_method: "cod",
    payment_status: "pending",
    stripe_payment_intent: null,
    subtotal_aed: 76,
    delivery_fee_aed: 0,
    discount_aed: 0,
    promo_code: null,
    total_aed: 76,
    created_at: "2026-06-08T12:40:00.000Z",
    order_items: [
      {
        product_id: "prod-1",
        product_name: "Margherita",
        quantity: 2,
        line_total_aed: 70,
        customizations: [],
      },
      {
        product_id: "prod-2",
        product_name: "Coke",
        quantity: 1,
        line_total_aed: 6,
        customizations: [],
      },
    ],
    ...overrides,
  };
}

describe("splitName", () => {
  test("single name -> empty last name", () => {
    expect(splitName("Madonna")).toEqual({
      first_name: "Madonna",
      last_name: "",
    });
  });
  test("multi-word last name keeps the remainder", () => {
    expect(splitName("Mary Jane Watson")).toEqual({
      first_name: "Mary",
      last_name: "Jane Watson",
    });
  });
  test("trims and collapses whitespace", () => {
    expect(splitName("  John   Doe  ")).toEqual({
      first_name: "John",
      last_name: "Doe",
    });
  });
  test("empty string -> empty parts", () => {
    expect(splitName("")).toEqual({ first_name: "", last_name: "" });
  });
});

describe("siteStatusToWoo", () => {
  test("maps every site status to its Woo status", () => {
    expect(siteStatusToWoo("received")).toBe("processing");
    expect(siteStatusToWoo("preparing")).toBe("processing");
    expect(siteStatusToWoo("out_for_delivery")).toBe("on-hold");
    expect(siteStatusToWoo("delivered")).toBe("completed");
    expect(siteStatusToWoo("cancelled")).toBe("cancelled");
  });
});

describe("orderRowToWooOrder — COD pickup, no promo", () => {
  const body = orderRowToWooOrder(baseRow());

  test("payment fields reflect COD, unpaid", () => {
    expect(body.payment_method).toBe("cod");
    expect(body.payment_method_title).toBe("Cash on Delivery");
    expect(body.set_paid).toBe(false);
    expect(body.transaction_id).toBeUndefined();
  });

  test("no shipping_lines and no shipping object for pickup", () => {
    expect(body.shipping_lines).toEqual([]);
    expect(body.shipping).toBeUndefined();
  });

  test("billing has no street address for pickup", () => {
    expect(body.billing.address_1).toBe("");
    expect(body.billing.address_2).toBe("");
    expect(body.billing.city).toBe("");
    expect(body.billing.state).toBe("Ajman");
    expect(body.billing.country).toBe("AE");
    expect(body.billing.first_name).toBe("John");
    expect(body.billing.last_name).toBe("Doe");
  });

  test("no coupon_lines when no promo", () => {
    expect(body.coupon_lines).toEqual([]);
  });

  test("id and number are the external order number", () => {
    expect(body.id).toBe("N7-00042");
    expect(body.number).toBe("N7-00042");
  });

  test("customer_note defaults to empty string", () => {
    expect(body.customer_note).toBe("");
  });

  test("meta_data carries order_number, order_id, delivery fields", () => {
    expect(body.meta_data).toEqual([
      { key: "order_number", value: "N7-00042" },
      { key: "order_id", value: "uuid-1" },
      { key: "delivery_type", value: "pickup" },
      { key: "delivery_slot", value: "ASAP" },
    ]);
  });
});

describe("orderRowToWooOrder — card delivery, with promo + customization", () => {
  const body = orderRowToWooOrder(
    baseRow({
      status: "received",
      delivery_type: "delivery",
      delivery_address: {
        street: "Sheikh Rashid St, Building 213",
        area: "Al Jurf",
        flat: "202",
      },
      order_notes: "Well-baked, light cheese",
      payment_method: "card",
      payment_status: "paid",
      stripe_payment_intent: "pi_3Q",
      subtotal_aed: 121,
      delivery_fee_aed: 15,
      discount_aed: 10,
      promo_code: "WELCOME10",
      total_aed: 126,
      order_items: [
        {
          product_id: "8f1c",
          product_name: "Margherita",
          quantity: 2,
          line_total_aed: 111,
          customizations: [
            { ingredient: "Extra cheese", choice: "extra", extraPrice: 15 },
            { ingredient: "Onion", choice: "without", extraPrice: 0 },
            { ingredient: "Base", choice: "default", extraPrice: 0 },
          ],
        },
      ],
    }),
  );

  test("payment fields reflect a paid card order", () => {
    expect(body.payment_method).toBe("stripe");
    expect(body.payment_method_title).toBe("Credit Card (Stripe)");
    expect(body.set_paid).toBe(true);
    expect(body.transaction_id).toBe("pi_3Q");
  });

  test("shipping mirrors billing for delivery", () => {
    expect(body.shipping).toBeDefined();
    expect(body.shipping?.address_1).toBe("Sheikh Rashid St, Building 213");
    expect(body.shipping?.address_2).toBe("202");
    expect(body.shipping?.city).toBe("Al Jurf");
    expect(body.billing.address_1).toBe("Sheikh Rashid St, Building 213");
    expect(body.billing.city).toBe("Al Jurf");
  });

  test("shipping_lines total equals the delivery fee", () => {
    expect(body.shipping_lines).toHaveLength(1);
    expect(body.shipping_lines[0]).toEqual({
      method_id: "flat_rate",
      method_title: "Delivery",
      total: "15.00",
    });
  });

  test("coupon_lines carries the code and discount", () => {
    expect(body.coupon_lines).toHaveLength(1);
    expect(body.coupon_lines[0]).toEqual({
      code: "WELCOME10",
      discount: "10.00",
    });
  });

  test("customizations map to line meta_data; default is dropped", () => {
    const line = body.line_items[0];
    expect(line.meta_data).toEqual([
      { key: "product_id", value: "8f1c" },
      { key: "Extra cheese", value: "extra (+15.00)" },
      { key: "Onion", value: "without" },
    ]);
  });

  test("customer_note passes through", () => {
    expect(body.customer_note).toBe("Well-baked, light cheese");
  });
});

describe("orderRowToWooOrder — line items + totals", () => {
  test("price === total / quantity, 2dp strings", () => {
    const body = orderRowToWooOrder(
      baseRow({
        order_items: [
          {
            product_id: "p1",
            product_name: "Margherita",
            quantity: 2,
            line_total_aed: 111,
            customizations: [],
          },
        ],
      }),
    );
    const line = body.line_items[0];
    expect(line.subtotal).toBe("111.00");
    expect(line.total).toBe("111.00");
    expect(line.price).toBe("55.50");
    expect(line.quantity).toBe(2);
  });

  test("multiple items -> multiple lines", () => {
    const body = orderRowToWooOrder(baseRow());
    expect(body.line_items).toHaveLength(2);
    expect(body.line_items.map((l) => l.name)).toEqual([
      "Margherita",
      "Coke",
    ]);
  });

  test("total is a 2dp string equal to subtotal - discount + delivery", () => {
    const row = baseRow({
      subtotal_aed: 121,
      discount_aed: 10,
      delivery_fee_aed: 15,
      total_aed: 126,
    });
    const body = orderRowToWooOrder(row);
    expect(body.total).toBe("126.00");
    const recomputed =
      Number(row.subtotal_aed) -
      Number(row.discount_aed) +
      Number(row.delivery_fee_aed);
    expect(body.total).toBe(recomputed.toFixed(2));
  });

  test("numeric strings from the DB are coerced and formatted", () => {
    const body = orderRowToWooOrder(
      baseRow({
        total_aed: "76",
        order_items: [
          {
            product_id: "p1",
            product_name: "Pizza",
            quantity: 1,
            line_total_aed: "40",
            customizations: null,
          },
        ],
      }),
    );
    expect(body.total).toBe("76.00");
    expect(body.line_items[0].total).toBe("40.00");
    expect(body.line_items[0].price).toBe("40.00");
  });
});

describe("statusToWooUpdate", () => {
  test("builds a minimal keyed update body", () => {
    expect(statusToWooUpdate("N7-00042", "delivered")).toEqual({
      id: "N7-00042",
      number: "N7-00042",
      status: "completed",
      meta_data: [{ key: "order_status", value: "delivered" }],
    });
  });

  test("carries the raw site status in meta for every status", () => {
    const cancelled = statusToWooUpdate("N7-1", "cancelled");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.meta_data[0]).toEqual({
      key: "order_status",
      value: "cancelled",
    });
  });
});
