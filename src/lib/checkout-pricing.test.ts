import { describe, expect, test } from "bun:test";
import {
  canonicalizeCheckoutCart,
  MAX_EXTRA_QUANTITY,
  type CatalogProductForCheckout,
} from "./checkout-pricing";

const PRODUCT_ID = "11111111-1111-1111-1111-111111111111";

const products: CatalogProductForCheckout[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Margherita",
    priceAed: 30,
    isActive: true,
    sizes: [
      { sizeId: "small", label: "Small", priceAed: 24 },
      { sizeId: "regular", label: "Regular", priceAed: 30 },
    ],
    customizations: [
      { ingredient: "Mozzarella", extraPrice: 5, removable: true },
      { ingredient: "Basil", extraPrice: null, removable: true },
    ],
  },
];

describe("canonicalizeCheckoutCart", () => {
  test("recomputes trusted prices from catalog, ignoring client totals", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: products[0].id,
          productName: "Fake cheap pizza",
          sizeId: "regular",
          quantity: 2,
          customizations: [
            { ingredient: "Mozzarella", choice: "extra", extraPrice: 0 },
          ],
        },
      ],
      products,
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.subtotalAed).toBe(70);
      expect(result.items[0].productName).toBe("Margherita");
      expect(result.items[0].basePriceAed).toBe(30);
      expect(result.items[0].customizations[0].extraPrice).toBe(5);
    }
  });

  test("blocks inactive products", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: products[0].id,
          productName: "Margherita",
          sizeId: "regular",
          quantity: 1,
          customizations: [],
        },
      ],
      [{ ...products[0], isActive: false }],
    );
    expect(result.ok).toBe(false);
  });

  test("blocks invalid sizes and changed customizations", () => {
    expect(
      canonicalizeCheckoutCart(
        [
          {
            productId: products[0].id,
            productName: "Margherita",
            sizeId: "small",
            quantity: 1,
            customizations: [
              { ingredient: "Unknown", choice: "extra", extraPrice: 100 },
            ],
          },
        ],
        products,
      ).ok,
    ).toBe(false);
  });
});


describe("ordering more than one helping of an extra", () => {
  const product: CatalogProductForCheckout = {
    id: PRODUCT_ID,
    name: "Margherita",
    priceAed: 38,
    isActive: true,
    sizes: [{ sizeId: "regular", label: "Medium", priceAed: 38 }],
    customizations: [
      { ingredient: "Mozzarella", extraPrice: 6, removable: true },
      { ingredient: "Basil", extraPrice: null, removable: true },
    ],
  };

  const cartWith = (c: Record<string, unknown>) => [
    {
      productId: PRODUCT_ID,
      productName: "Margherita",
      sizeId: "regular" as const,
      quantity: 1,
      customizations: [
        { ingredient: "Mozzarella", choice: "extra" as const, extraPrice: 6, ...c },
      ],
    },
  ];

  test("three helpings cost three times the catalogue rate", () => {
    const result = canonicalizeCheckoutCart(cartWith({ extraQuantity: 3 }), [product]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // 38 + (6 x 3)
    expect(result.subtotalAed).toBe(56);
    expect(result.items[0].customizations[0].extraQuantity).toBe(3);
    // The stored rate stays per-helping; displays multiply it themselves.
    expect(result.items[0].customizations[0].extraPrice).toBe(6);
  });

  // Carts already sitting in customers' localStorage have no such field, and an
  // "extra" has always meant exactly one helping.
  test("a cart saved before the field existed still means one helping", () => {
    const result = canonicalizeCheckoutCart(cartWith({}), [product]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotalAed).toBe(44);
    expect(result.items[0].customizations[0].extraQuantity).toBe(1);
  });

  test("the count is clamped, never used to overcharge", () => {
    const result = canonicalizeCheckoutCart(cartWith({ extraQuantity: 99 }), [product]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].customizations[0].extraQuantity).toBe(MAX_EXTRA_QUANTITY);
    expect(result.subtotalAed).toBe(38 + 6 * MAX_EXTRA_QUANTITY);
  });

  test("a junk count falls back to one rather than failing the order", () => {
    for (const bad of [0, -4, 1.6, Number.NaN]) {
      const result = canonicalizeCheckoutCart(cartWith({ extraQuantity: bad }), [product]);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // 1.6 rounds to 2; the rest floor to 1. None of them error.
      const n = result.items[0].customizations[0].extraQuantity!;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(MAX_EXTRA_QUANTITY);
    }
  });

  // The price is the catalogue's. A client claiming a cheaper rate gets charged
  // the real one, and claiming a dearer one does not enrich the order either.
  test("a client-sent rate is ignored however many helpings are asked for", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: PRODUCT_ID,
          productName: "Margherita",
          sizeId: "regular",
          quantity: 1,
          customizations: [
            { ingredient: "Mozzarella", choice: "extra", extraPrice: 0.01, extraQuantity: 2 },
          ],
        },
      ],
      [product],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotalAed).toBe(50); // 38 + 6 x 2, not 38 + 0.02
  });

  test("a count on a removal is ignored", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: PRODUCT_ID,
          productName: "Margherita",
          sizeId: "regular",
          quantity: 1,
          customizations: [
            { ingredient: "Mozzarella", choice: "without", extraPrice: 0, extraQuantity: 4 },
          ],
        },
      ],
      [product],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotalAed).toBe(38);
    expect(result.items[0].customizations[0].extraQuantity).toBeUndefined();
  });

  test("helpings multiply with the line quantity", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: PRODUCT_ID,
          productName: "Margherita",
          sizeId: "regular",
          quantity: 2,
          customizations: [
            { ingredient: "Mozzarella", choice: "extra", extraPrice: 6, extraQuantity: 3 },
          ],
        },
      ],
      [product],
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.subtotalAed).toBe(112); // (38 + 18) x 2
  });

  test("an ingredient with no extra price cannot be multiplied into one", () => {
    const result = canonicalizeCheckoutCart(
      [
        {
          productId: PRODUCT_ID,
          productName: "Margherita",
          sizeId: "regular",
          quantity: 1,
          customizations: [
            { ingredient: "Basil", choice: "extra", extraPrice: 3, extraQuantity: 5 },
          ],
        },
      ],
      [product],
    );
    expect(result.ok).toBe(false);
  });
});
