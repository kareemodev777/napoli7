import { describe, expect, test } from "bun:test";
import {
  canonicalizeCheckoutCart,
  type CatalogProductForCheckout,
} from "./checkout-pricing";

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

