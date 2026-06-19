"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validatePromo, redeemPromo } from "@/lib/promo";
import { resolveDeliveryFee } from "@/lib/checkout";
import {
  getDeliveryOrderTotalAed,
  getDeliveryMinimumSubtotalAed,
  meetsDeliveryMinimumAed,
} from "@/lib/delivery-settings";
import { canonicalizeCheckoutCart } from "@/lib/checkout-pricing";
import { planAddressSave, type AddressLike } from "@/lib/saved-address";
import { pushOrderToPos } from "@/lib/pos/push";
import { HAS_SUPABASE } from "@/lib/env";
import { getOrderingAvailability } from "@/lib/ordering-hours";
import type { SupabaseClient } from "@supabase/supabase-js";

const customizationSchema = z.object({
  ingredient: z.string(),
  choice: z.enum(["default", "extra", "without"]),
  extraPrice: z.number().min(0),
});

const itemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  sizeId: z.enum(["small", "regular", "large", "family"]),
  basePriceAed: z.number().positive(),
  quantity: z.number().int().min(1).max(20),
  customizations: z.array(customizationSchema),
  lineTotalAed: z.number().positive(),
});

const deliveryAddressSchema = z.object({
  street: z.string().min(5),
  area: z.string().min(2),
  flat: z.string().optional(),
  notes: z.string().max(200).optional(),
  mapQuery: z.string().max(300).optional(),
});

const placeOrderSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z
    .string()
    .regex(
      /^\+971[0-9]{8,9}$/,
      "Enter a valid UAE mobile number starting with +971",
    ),
  email: z.string().email(),
  deliveryType: z.enum(["delivery", "pickup"]),
  deliveryAddress: deliveryAddressSchema.optional(),
  deliverySlot: z.string().min(1),
  orderNotes: z.string().max(500).optional(),
  pizzaCut: z.boolean().optional(),
  paymentMethod: z.literal("card"),
  promoCode: z.string().max(40).optional(),
  items: z.array(itemSchema).min(1),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export interface PlaceOrderResult {
  orderId?: string;
  orderNumber?: string;
  paymentUrl?: string;
  error?: string;
}

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Some fields are missing or invalid.",
    };
  }
  const data = parsed.data;
  if (data.deliveryType === "delivery" && !data.deliveryAddress) {
    return { error: "Add a delivery address or switch to pickup." };
  }

  const orderingAvailability = await getOrderingAvailability();
  if (!orderingAvailability.isOpen) {
    return {
      error:
        orderingAvailability.nextOpenLabel
          ? `We’re closed right now. Ordering opens again at ${orderingAvailability.nextOpenLabel}.`
          : "We’re closed right now. Please check back when we reopen.",
    };
  }

  let canonicalItems = data.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    basePriceAed: item.basePriceAed,
    quantity: item.quantity,
    customizations: item.customizations,
    lineTotalAed: item.lineTotalAed,
  }));
  let subtotal = canonicalItems.reduce((s, i) => s + i.lineTotalAed, 0);

  if (HAS_SUPABASE) {
    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const supabase = await createClient();
    const { data: products, error: productError } = await supabase
      .from("products")
      .select(
        "id, name, price_aed, is_active, product_sizes(size_id, label, price_aed), product_customizations(ingredient, extra_price, removable)",
      )
      .in("id", productIds);

    if (productError || !products) {
      console.error("[placeOrder] product validation failed:", productError);
      return {
        error:
          "We could not validate the latest menu prices. Please refresh and try again.",
      };
    }

    const canonical = canonicalizeCheckoutCart(
      data.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sizeId: item.sizeId,
        quantity: item.quantity,
        customizations: item.customizations,
      })),
      products.map((product) => ({
        id: product.id,
        name: product.name,
        priceAed: Number(product.price_aed),
        isActive: Boolean(product.is_active),
        sizes: (product.product_sizes ?? []).map(
          (size: { size_id: string; label: string; price_aed: number | string }) => ({
            sizeId: size.size_id,
            label: size.label,
            priceAed: Number(size.price_aed),
          }),
        ),
        customizations: (product.product_customizations ?? []).map(
          (customization: {
            ingredient: string;
            extra_price: number | string | null;
            removable: boolean;
          }) => ({
            ingredient: customization.ingredient,
            extraPrice:
              customization.extra_price === null
                ? null
                : Number(customization.extra_price),
            removable: Boolean(customization.removable),
          }),
        ),
      })),
    );
    if (!canonical.ok) return { error: canonical.error };
    canonicalItems = canonical.items;
    subtotal = canonical.subtotalAed;
  }

  // Re-validate the promo server-side — never trust a client-sent amount.
  let discount = 0;
  let appliedPromo: string | undefined;
  if (data.promoCode) {
    const promoResult = await validatePromo(data.promoCode, subtotal);
    if (promoResult.code && promoResult.amount) {
      discount = promoResult.amount;
      appliedPromo = promoResult.code;
    }
    // An invalid/expired code at submit time is ignored (no discount applied);
    // the cart UI already validated, so this only catches edge races.
  }

  const deliveryMinSubtotalAed = await getDeliveryMinimumSubtotalAed();

  // Authoritative delivery-zone check. An unsupported area is blocked outright —
  // never charged a default fee — mirroring the client-side guard (UC-45).
  let deliveryFee = 0;
  if (data.deliveryType === "delivery" && data.deliveryAddress) {
    const zone = await resolveDeliveryFee(data.deliveryAddress.area);
    if (!zone.supported) {
      return {
        error:
          "We don't deliver to that area yet. Choose a supported area or switch to pickup.",
      };
    }
    deliveryFee = zone.fee;
    if (!meetsDeliveryMinimumAed({
      subtotalAed: subtotal,
      deliveryFeeAed: deliveryFee,
      discountAed: discount,
      minimumAed: deliveryMinSubtotalAed,
    })) {
      return {
        error: `Delivery orders need a minimum total of ${deliveryMinSubtotalAed} AED including delivery. Add a little more, or switch to pickup.`,
      };
    }
  }
  const total = getDeliveryOrderTotalAed({
    subtotalAed: subtotal,
    deliveryFeeAed: deliveryFee,
    discountAed: discount,
  });

  if (!HAS_SUPABASE) {
    return {
      error:
        "Card payment requires Stripe + Supabase env vars. Please try again in the live environment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: user?.id ?? null,
      customer_name: `${data.firstName} ${data.lastName}`,
      customer_phone: data.phone,
      customer_email: data.email,
      delivery_type: data.deliveryType,
      delivery_address:
        data.deliveryType === "delivery" ? data.deliveryAddress : null,
      delivery_slot: data.deliverySlot,
      order_notes: data.orderNotes ?? null,
      pizza_cut: data.pizzaCut ?? false,
      payment_method: data.paymentMethod,
      payment_status: "pending",
      promo_code: appliedPromo ?? null,
      discount_aed: discount,
      subtotal_aed: subtotal,
      delivery_fee_aed: deliveryFee,
      total_aed: total,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[placeOrder] Order insert failed:", orderError);
    return {
      error:
        "We could not place your order. Please try again or call us on +971 6 534 5772.",
    };
  }

  const itemRows = canonicalItems.map((item) => ({
    order_id: order.id,
    product_id: item.productId,
    product_name: item.productName,
    base_price_aed: item.basePriceAed,
    quantity: item.quantity,
    customizations: item.customizations,
    line_total_aed: item.lineTotalAed,
  }));
  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(itemRows);
  if (itemsError) {
    console.error("[placeOrder] Order items insert failed:", itemsError);
  }

  // Save the delivery address to the customer's profile so future checkouts
  // prefill it. First saved address becomes their default automatically.
  if (user && data.deliveryType === "delivery" && data.deliveryAddress) {
    await persistDeliveryAddress(supabase, user.id, data.deliveryAddress);
  }

  // Redeem the promo right away. Card-only checkout means there is no delayed
  // cash branch anymore, and the Stripe webhook handles the paid path.
  if (appliedPromo) {
    try {
      const redeemed = await redeemPromo(appliedPromo);
      if (!redeemed) {
        console.warn(
          `[placeOrder] Promo ${appliedPromo} could not be redeemed (exhausted/expired) on order ${order.order_number}`,
        );
      }
    } catch (e) {
      console.error("[placeOrder] promo redeem failed:", e);
    }
  }

  // Defer fulfillment to the Stripe webhook: the kitchen is notified only
  // after `checkout.session.completed` confirms the card was actually charged.
  // Notifying here would alert the kitchen for checkouts the customer abandons.
  // The promo (if any) is redeemed there too, for the same reason.
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    paymentUrl: `/api/checkout/create-session?orderId=${order.id}`,
  };

}

async function persistDeliveryAddress(
  supabase: SupabaseClient,
  userId: string,
  address: AddressLike & { notes?: string },
) {
  try {
    const { data: existing } = await supabase
      .from("saved_addresses")
      .select("street, area, flat")
      .eq("user_id", userId);

    const { shouldSave, makeDefault } = planAddressSave(
      (existing ?? []) as AddressLike[],
      address,
    );
    if (!shouldSave) return;

    if (makeDefault) {
      await supabase
        .from("saved_addresses")
        .update({ is_default: false })
        .eq("user_id", userId);
    }

    await supabase.from("saved_addresses").insert({
      user_id: userId,
      label: "Delivery",
      street: address.street,
      area: address.area,
      flat: address.flat || null,
      notes: address.notes || null,
      is_default: makeDefault,
    });
  } catch (e) {
    // Saving the address is a convenience, never block order placement on it.
    console.error("[placeOrder] save address failed:", e);
  }
}

