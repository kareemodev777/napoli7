import { expect, mock, test } from "bun:test";

const sendKitchenNotificationsForOrder = mock(async () => {});
const pushOrderToPos = mock(async () => {});

mock.module("@/lib/env", () => ({
  HAS_SUPABASE: true,
  HAS_SUPABASE_SERVICE: true,
}));
mock.module("@/lib/ordering-hours", () => ({
  getOrderingAvailability: async () => ({ isOpen: true }),
}));
mock.module("@/lib/checkout", () => ({
  resolveDeliveryFee: async () => ({ supported: true, fee: 0 }),
}));
mock.module("@/lib/delivery-settings", () => ({
  getDeliveryOrderTotalAed: ({ subtotalAed, deliveryFeeAed, discountAed }: { subtotalAed: number; deliveryFeeAed: number; discountAed: number; }) => subtotalAed + deliveryFeeAed - discountAed,
  getDeliveryMinimumSubtotalAed: async () => 0,
  meetsDeliveryMinimumAed: () => true,
  computeOrderFeesAed: () => ({ deliveryFeeAed: 9, serviceFeeAed: 3 }),
}));
mock.module("@/lib/delivery-map", () => ({
  checkDeliverability: () => ({ deliverable: true, distanceKm: 0 }),
  deliverabilityMessage: () => "",
  DELIVERY_RADIUS_KM: 7,
}));
mock.module("@/lib/saved-address", () => ({
  planAddressSave: () => ({ shouldSave: false, makeDefault: false }),
}));
mock.module("@/lib/promo", () => ({
  validatePromo: async () => ({ code: null, amount: null }),
  redeemPromo: async () => true,
}));
mock.module("@/lib/notifications/kitchen", () => ({
  sendKitchenNotificationsForOrder,
}));
mock.module("@/lib/pos/push", () => ({
  pushOrderToPos,
}));
mock.module("@/lib/checkout-pricing", () => ({
  canonicalizeCheckoutCart: () => ({
    ok: true,
    items: [
      {
        productId: "0dbe7c02-9404-44bf-84a8-36eb500dfcb8",
        productName: "Ortolana (Vegetarian)",
        basePriceAed: 41,
        quantity: 1,
        customizations: [],
        lineTotalAed: 41,
      },
    ],
    subtotalAed: 41,
  }),
}));

const fakeSupabase = {
  auth: {
    getUser: async () => ({ data: { user: null } }),
  },
  from(table: string) {
    if (table === "products") {
      return {
        select: () => ({
          in: async () => ({
            data: [
              {
                id: "0dbe7c02-9404-44bf-84a8-36eb500dfcb8",
                name: "Ortolana (Vegetarian)",
                price_aed: 41,
                is_active: true,
                product_sizes: [
                  { size_id: "regular", label: "Medium", price_aed: 41 },
                ],
                product_customizations: [],
              },
            ],
            error: null,
          }),
        }),
      };
    }
    if (table === "orders") {
      return {
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: { id: "order-1", order_number: "N7-00099" },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "order_items") {
      return {
        insert: async () => ({ error: null }),
      };
    }
    if (table === "saved_addresses") {
      return {
        select: () => ({
          eq: async () => ({ data: [] }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
        insert: async () => ({ error: null }),
      };
    }
    throw new Error(`Unexpected table ${table}`);
  },
};

mock.module("@/lib/supabase/server", () => ({
  createClient: async () => fakeSupabase,
}));

const { placeOrder } = await import("./actions");

test("pickup COD order triggers kitchen and POS handoff", async () => {
  const result = await placeOrder({
    firstName: "AK",
    lastName: "Smoke",
    phone: "+971501234567",
    email: "ak@example.com",
    deliveryType: "pickup",
    deliverySlot: "ASAP",
    pizzaCut: false,
    paymentMethod: "cod",
    items: [
      {
        productId: "0dbe7c02-9404-44bf-84a8-36eb500dfcb8",
        productName: "Ortolana (Vegetarian)",
        sizeId: "regular",
        basePriceAed: 41,
        quantity: 1,
        customizations: [],
        lineTotalAed: 41,
      },
    ],
  });

  expect(result).toEqual({ orderId: "order-1", orderNumber: "N7-00099" });
  expect(sendKitchenNotificationsForOrder).toHaveBeenCalledTimes(1);
  expect(pushOrderToPos).toHaveBeenCalledTimes(1);
});

test("delivery COD order is accepted and placed without a payment redirect", async () => {
  const result = await placeOrder({
    firstName: "AK",
    lastName: "Smoke",
    phone: "+971501234567",
    email: "ak@example.com",
    deliveryType: "delivery",
    deliveryAddress: {
      street: "Test St",
      area: "Ajman",
      flat: "1",
      lat: 25.4,
      lng: 55.5,
    },
    deliverySlot: "ASAP",
    pizzaCut: false,
    paymentMethod: "cod",
    items: [
      {
        productId: "0dbe7c02-9404-44bf-84a8-36eb500dfcb8",
        productName: "Ortolana (Vegetarian)",
        sizeId: "regular",
        basePriceAed: 41,
        quantity: 1,
        customizations: [],
        lineTotalAed: 41,
      },
    ],
  });

  // Cash orders are placed immediately (no Stripe redirect), for delivery as
  // well as pickup.
  expect(result.error).toBeUndefined();
  expect(result.orderId).toBe("order-1");
  expect(result.paymentUrl).toBeUndefined();
});
