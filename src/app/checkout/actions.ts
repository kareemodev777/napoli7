"use server";

import { z } from "zod";
import { UUID_RE } from "@/lib/uuid";
import { createClient } from "@/lib/supabase/server";
import { validatePromo, redeemPromo } from "@/lib/promo";
import { resolveDeliveryFee } from "@/lib/checkout";
import {
  computeOrderFeesAed,
  getDeliveryOrderTotalAed,
  getDeliveryMinimumSubtotalAed,
  meetsDeliveryMinimumAed,
} from "@/lib/delivery-settings";
import {
  canonicalizeCheckoutCart,
  type CanonicalOrderItem,
} from "@/lib/checkout-pricing";
import { isRewardPickupOnly } from "@/lib/reward-promo";
import { checkDeliverability, deliverabilityMessage } from "@/lib/delivery-map";
import { placeholderEmailForPhone } from "@/lib/auth/placeholder-email";
import { planAddressSave, type AddressLike } from "@/lib/saved-address";
import { sendKitchenNotificationsForOrder } from "@/lib/notifications/kitchen";
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
  // Lenient: some catalog ids (drinks) aren't RFC-4122 versioned but are valid
  // DB uuids. Strict z.uuid() rejected them, failing checkout for any drink.
  productId: z.string().regex(UUID_RE),
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
  lat: z.number().optional(),
  lng: z.number().optional(),
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
  // Optional, like registration: a customer who signed up on their phone alone
  // has no address to give, and must still be able to order. They are reachable
  // by SMS, which is the channel that matters for a pizza.
  email: z
    .string()
    .trim()
    .email("Enter a valid email, or leave it blank.")
    .optional()
    .or(z.literal("")),
  deliveryType: z.enum(["delivery", "pickup"]),
  deliveryAddress: deliveryAddressSchema.optional(),
  deliverySlot: z.string().min(1),
  orderNotes: z.string().max(500).optional(),
  pizzaCut: z.boolean().optional(),
  paymentMethod: z.enum(["card", "cod"]),
  // Several codes may be spent on one order (friends pooling free-pizza rewards).
  promoCodes: z.array(z.string().max(40)).max(10).optional(),
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
    // A non-UUID productId means the cart holds stale items from a previous
    // menu (e.g. demo/mock slugs like "margherita-classic"). Surface a
    // recoverable message instead of leaking the raw Zod "Invalid UUID".
    const staleCart = parsed.error.issues.some((issue) =>
      issue.path.includes("productId"),
    );
    if (staleCart) {
      return {
        error:
          "Your cart is out of date. Please clear it and re-add your items from the menu.",
      };
    }
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
  if (data.deliveryType === "delivery" && data.paymentMethod === "cod") {
    return { error: "Cash on delivery is available for pickup orders only." };
  }

  const orderingAvailability = await getOrderingAvailability();
  if (!orderingAvailability.isOpen) {
    return {
      error: orderingAvailability.nextOpenLabel
        ? `We’re closed right now. Ordering opens again at ${orderingAvailability.nextOpenLabel}.`
        : "We’re closed right now. Please check back when we reopen.",
    };
  }

  let canonicalItems: CanonicalOrderItem[] = data.items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    basePriceAed: item.basePriceAed,
    quantity: item.quantity,
    customizations: item.customizations,
    lineTotalAed: item.lineTotalAed,
    // Dev/no-Supabase fallback: keep the client size id as the label.
    sizeLabel: item.sizeId,
  }));
  let subtotal = canonicalItems.reduce((s, i) => s + i.lineTotalAed, 0);
  // Category per product, read from the catalogue. The reward rule turns on it
  // (a drink is not an upgrade), so it must never come from the client.
  let categoryByProduct = new Map<string, string>();

  if (HAS_SUPABASE) {
    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const supabase = await createClient();
    const { data: products, error: productError } = await supabase
      .from("products")
      .select(
        "id, category_id, name, price_aed, is_active, product_sizes(size_id, label, price_aed), product_customizations(ingredient, extra_price, removable)",
      )
      .in("id", productIds);

    if (productError || !products) {
      console.error("[placeOrder] product validation failed:", productError);
      return {
        error:
          "We could not validate the latest menu prices. Please refresh and try again.",
      };
    }

    categoryByProduct = new Map(
      (products as Array<{ id: string; category_id: string }>).map((p) => [
        p.id,
        p.category_id,
      ]),
    );

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
          (size: {
            size_id: string;
            label: string;
            price_aed: number | string;
          }) => ({
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

  // Re-validate EVERY code server-side — never trust a client-sent amount. Each
  // code is worth its face value once, so duplicates are collapsed before they are
  // priced: sending the same code three times must not treble the discount.
  let discount = 0;
  const appliedPromos: string[] = [];
  let rewardCount = 0;
  const submittedCodes = [
    ...new Set((data.promoCodes ?? []).map((c) => c.trim().toUpperCase())),
  ].filter(Boolean);

  for (const code of submittedCodes) {
    const promoResult = await validatePromo(code, subtotal);
    if (!promoResult.code || !promoResult.amount) continue;
    // An invalid/expired code at submit time is ignored (no discount), as before.
    appliedPromos.push(promoResult.code);
    discount += promoResult.amount;
    if (promoResult.isReward) rewardCount += 1;
  }

  // Cap the total at the value of the goods. Stripe is sent the line items and
  // asserts they less the discount equal the charge; a discount larger than the
  // basket makes that sum negative and every card payment throws. Capping puts the
  // items at zero and leaves the fees owed — which is the intent: the reward buys
  // pizza, not delivery.
  discount = Math.min(discount, subtotal);

  const deliveryMinSubtotalAed = await getDeliveryMinimumSubtotalAed();

  // Authoritative delivery-zone check. An unsupported area is blocked outright —
  // never charged a default fee — mirroring the client-side guard (UC-45).
  let deliveryFee = 0;
  let serviceFee = 0;
  if (data.deliveryType === "delivery" && data.deliveryAddress) {
    // A reward order only unlocks delivery once it carries food beyond the free
    // pizzas the codes pay for — a second pizza, a focaccia, a dessert, anything
    // we are being paid for. One upgrade is enough for the whole order however
    // many codes are stacked on it. Drinks do not count: a can of cola alongside
    // three free pizzas is not an order worth sending a driver out for.
    const eligibilityItems = data.items.map((item) => ({
      categoryId: categoryByProduct.get(item.productId) ?? "",
      quantity: item.quantity,
    }));
    if (isRewardPickupOnly(eligibilityItems, rewardCount)) {
      return {
        error:
          "Your free pizza is pickup-only on its own. Add a pizza, a focaccia or a dessert to unlock delivery — a drink doesn't count — or switch to pickup.",
      };
    }
    // The authoritative out-of-zone guard. The customer must drop a GPS pin, and
    // it must clear BOTH the radius and the Ajman boundary. The area dropdown is
    // not consulted for this: it is a convenience field, and any area can be
    // paired with any street, so only the pin decides.
    const { lat, lng } = data.deliveryAddress;
    const deliverability = checkDeliverability(lat, lng);
    if (!deliverability.deliverable) {
      return { error: deliverabilityMessage(deliverability) };
    }
    const zone = await resolveDeliveryFee(data.deliveryAddress.area);
    if (!zone.supported) {
      return {
        error:
          "We don't deliver to that area yet. Choose a supported area or switch to pickup.",
      };
    }
    // Both fees are derived, never taken from the client: the zone fee is waived
    // above the free-delivery threshold, the service fee never is.
    ({ deliveryFeeAed: deliveryFee, serviceFeeAed: serviceFee } =
      computeOrderFeesAed({
        deliveryType: "delivery",
        subtotalAed: subtotal,
        zoneFeeAed: zone.fee,
      }));
    // The 13 AED delivery minimum does NOT apply to a reward order — the client
    // was explicit. The upgrade rule above is what guards a reward delivery, and
    // making a customer top up to 13 AED as well would gate the free pizza twice.
    if (
      rewardCount === 0 &&
      !meetsDeliveryMinimumAed({
        subtotalAed: subtotal,
        deliveryFeeAed: deliveryFee,
        discountAed: discount,
        minimumAed: deliveryMinSubtotalAed,
      })
    ) {
      return {
        error: `Delivery orders need at least ${deliveryMinSubtotalAed} AED in items (the fees don't count). Add a little more, or switch to pickup.`,
      };
    }
  }
  const total = getDeliveryOrderTotalAed({
    subtotalAed: subtotal,
    deliveryFeeAed: deliveryFee,
    serviceFeeAed: serviceFee,
    discountAed: discount,
  });

  if (!HAS_SUPABASE) {
    return {
      error:
        "Ordering requires Supabase env vars. Please try again in the live environment.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      // `||` (not `??`) so an empty-string id can never reach the uuid column —
      // guests are stored as null, avoiding the "invalid input syntax for uuid".
      user_id: user?.id || null,
      customer_name: `${data.firstName} ${data.lastName}`,
      customer_phone: data.phone,
      // customer_email is NOT NULL, and a phone-only customer has no address to
      // put in it. The placeholder keeps the column honest and never gets mailed
      // (sendBrandedEmail drops it) — their updates go out by SMS.
      customer_email:
        data.email?.trim() || placeholderEmailForPhone(data.phone),
      delivery_type: data.deliveryType,
      delivery_address:
        data.deliveryType === "delivery" ? data.deliveryAddress : null,
      delivery_slot: data.deliverySlot,
      order_notes: data.orderNotes ?? null,
      pizza_cut: data.pizzaCut ?? false,
      payment_method: data.paymentMethod,
      payment_status: "pending",
      // promo_code keeps the first code so every existing reader (POS, admin,
      // history) works unchanged; promo_codes is the truth.
      promo_code: appliedPromos[0] ?? null,
      promo_codes: appliedPromos,
      discount_aed: discount,
      subtotal_aed: subtotal,
      delivery_fee_aed: deliveryFee,
      service_fee_aed: serviceFee,
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
    size_label: item.sizeLabel,
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

  // Redeem the promo right away. The order is already in the database, so the
  // voucher can be consumed whether the customer is paying by card or pickup
  // cash.
  // Redeem every code, not just the first. Each is single-use; one that cannot be
  // consumed is logged rather than failing the order, which is already placed.
  for (const code of appliedPromos) {
    try {
      const redeemed = await redeemPromo(code);
      if (!redeemed) {
        console.warn(
          `[placeOrder] Promo ${code} could not be redeemed (exhausted/expired) on order ${order.order_number}`,
        );
      }
    } catch (e) {
      console.error("[placeOrder] promo redeem failed:", e);
    }
  }

  // Card orders are fulfilled by the Stripe webhook after payment succeeds.
  // COD pickup orders are fulfilled immediately here so the kitchen and POS
  // get the ticket without waiting for a payment callback.
  if (data.paymentMethod === "cod") {
    try {
      await sendKitchenNotificationsForOrder(order.id);
    } catch (e) {
      console.error("[placeOrder] kitchen notification failed:", e);
    }
    try {
      await pushOrderToPos(order.id);
    } catch (e) {
      console.error("[placeOrder] POS push failed:", e);
    }
    return {
      orderId: order.id,
      orderNumber: order.order_number,
    };
  }

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
