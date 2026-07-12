export type CheckoutSizeId = "small" | "regular" | "large" | "family";
export type CheckoutCustomizationChoice = "default" | "extra" | "without";

export interface CheckoutCustomizationInput {
  ingredient: string;
  choice: CheckoutCustomizationChoice;
  extraPrice: number;
}

export interface CheckoutCartItemInput {
  productId: string;
  productName: string;
  sizeId: CheckoutSizeId;
  quantity: number;
  customizations: CheckoutCustomizationInput[];
}

export interface CatalogProductForCheckout {
  id: string;
  name: string;
  priceAed: number;
  isActive: boolean;
  isTemporarilyUnavailable?: boolean;
  sizes: Array<{
    sizeId: string;
    label: string;
    priceAed: number;
  }>;
  customizations: Array<{
    ingredient: string;
    extraPrice: number | null;
    removable: boolean;
  }>;
}

export interface CanonicalOrderItem {
  productId: string;
  productName: string;
  basePriceAed: number;
  quantity: number;
  customizations: CheckoutCustomizationInput[];
  lineTotalAed: number;
  /** The chosen size's label (e.g. "Small"). Null for single-size products. */
  sizeLabel: string | null;
}

export type CanonicalCartResult =
  | { ok: true; items: CanonicalOrderItem[]; subtotalAed: number }
  | { ok: false; error: string };

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeIngredient(value: string): string {
  return value.trim().toLowerCase();
}

export function canonicalizeCheckoutCart(
  cartItems: CheckoutCartItemInput[],
  products: CatalogProductForCheckout[],
): CanonicalCartResult {
  const byId = new Map(products.map((p) => [p.id, p]));
  const canonicalItems: CanonicalOrderItem[] = [];

  for (const item of cartItems) {
    const product = byId.get(item.productId);
    if (!product || !product.isActive || product.isTemporarilyUnavailable) {
      return {
        ok: false,
        error: `${item.productName || "This item"} is momentarily unavailable. Remove it from the cart and try again.`,
      };
    }

    const sizes = product.sizes.length
      ? product.sizes
      : [
          {
            sizeId: "regular",
            label: "Regular",
            priceAed: product.priceAed,
          },
        ];
    const size = sizes.find((s) => s.sizeId === item.sizeId);
    if (!size) {
      return {
        ok: false,
        error: `${product.name} is no longer available in that size. Remove it from the cart and try again.`,
      };
    }

    const customByIngredient = new Map(
      product.customizations.map((c) => [normalizeIngredient(c.ingredient), c]),
    );

    let unitPrice = Number(size.priceAed);
    const canonicalCustomizations: CheckoutCustomizationInput[] = [];

    for (const customization of item.customizations) {
      const catalogCustomization = customByIngredient.get(
        normalizeIngredient(customization.ingredient),
      );
      if (!catalogCustomization) {
        return {
          ok: false,
          error: `${product.name} customization changed. Remove it from the cart and try again.`,
        };
      }

      if (customization.choice === "extra") {
        const extra = catalogCustomization.extraPrice;
        if (extra === null || extra < 0) {
          return {
            ok: false,
            error: `${catalogCustomization.ingredient} can no longer be added extra. Remove it from the cart and try again.`,
          };
        }
        unitPrice += Number(extra);
        canonicalCustomizations.push({
          ingredient: catalogCustomization.ingredient,
          choice: "extra",
          extraPrice: money(Number(extra)),
        });
      } else if (customization.choice === "without") {
        if (!catalogCustomization.removable) {
          return {
            ok: false,
            error: `${catalogCustomization.ingredient} can no longer be removed. Remove it from the cart and try again.`,
          };
        }
        canonicalCustomizations.push({
          ingredient: catalogCustomization.ingredient,
          choice: "without",
          extraPrice: 0,
        });
      } else {
        canonicalCustomizations.push({
          ingredient: catalogCustomization.ingredient,
          choice: "default",
          extraPrice: 0,
        });
      }
    }

    const canonicalUnit = money(unitPrice);
    canonicalItems.push({
      productId: product.id,
      productName: product.name,
      basePriceAed: money(Number(size.priceAed)),
      quantity: item.quantity,
      customizations: canonicalCustomizations,
      lineTotalAed: money(canonicalUnit * item.quantity),
      // Only meaningful when the product actually offers a choice of sizes.
      sizeLabel: product.sizes.length > 1 ? size.label : null,
    });
  }

  return {
    ok: true,
    items: canonicalItems,
    subtotalAed: money(canonicalItems.reduce((s, i) => s + i.lineTotalAed, 0)),
  };
}
