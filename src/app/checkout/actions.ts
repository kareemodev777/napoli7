"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyKitchenEmail } from "@/lib/notifications/email";
import { notifyKitchenWhatsApp } from "@/lib/notifications/whatsapp";
import { validatePromo, redeemPromo } from "@/lib/promo";
import { getDeliveryFee } from "@/lib/checkout";
import { planAddressSave, type AddressLike } from "@/lib/saved-address";
import { HAS_SUPABASE } from "@/lib/env";
import type { SupabaseClient } from "@supabase/supabase-js";

const customizationSchema = z.object({
  ingredient: z.string(),
  choice: z.enum(["default", "extra", "without"]),
  extraPrice: z.number().min(0),
});

const itemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
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
  paymentMethod: z.enum(["cod", "card"]),
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

  const subtotal = data.items.reduce((s, i) => s + i.lineTotalAed, 0);

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

  const deliveryFee =
    data.deliveryType === "delivery" && data.deliveryAddress
      ? await getDeliveryFee(data.deliveryAddress.area)
      : 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  if (!HAS_SUPABASE) {
    const orderId = crypto.randomUUID();
    const orderNumber = `N7-DEMO-${Date.now().toString().slice(-5)}`;
    console.info(
      `[placeOrder] Supabase disabled. Demo order ${orderNumber} (${total.toFixed(2)} AED) for ${data.firstName} ${data.lastName}`,
    );
    if (data.paymentMethod === "card") {
      // No kitchen notification here — card orders are only fulfilled after the
      // Stripe webhook confirms payment. (Demo mode can't reach that path.)
      return {
        orderId,
        orderNumber,
        error:
          "Card payment requires Stripe + Supabase env vars. Choose Cash on Delivery for now.",
      };
    }
    await runNotifications({ data, orderId, orderNumber, total });
    return { orderId, orderNumber };
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

  const itemRows = data.items.map((item) => ({
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
  if (
    user &&
    data.deliveryType === "delivery" &&
    data.deliveryAddress
  ) {
    await persistDeliveryAddress(supabase, user.id, data.deliveryAddress);
  }

  // Redeem the promo only for cash on delivery, which is confirmed the moment
  // it's placed. Card orders defer redemption to the Stripe webhook so a code is
  // never consumed by a checkout the customer abandons before paying.
  if (appliedPromo && data.paymentMethod === "cod") {
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

  if (data.paymentMethod === "card") {
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

  // Cash on delivery: there's no payment step, so notify the kitchen now.
  await runNotifications({
    data,
    orderId: order.id,
    orderNumber: order.order_number,
    total,
  });

  revalidatePath("/account/orders");
  return { orderId: order.id, orderNumber: order.order_number };
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

async function runNotifications(args: {
  data: PlaceOrderInput;
  orderId: string;
  orderNumber: string;
  total: number;
}) {
  const { data, orderId, orderNumber, total } = args;
  const payload = {
    orderId,
    orderNumber,
    customerName: `${data.firstName} ${data.lastName}`,
    customerPhone: data.phone,
    customerEmail: data.email,
    deliveryType: data.deliveryType,
    deliveryAddress: data.deliveryAddress,
    deliverySlot: data.deliverySlot,
    paymentMethod: data.paymentMethod,
    totalAed: total,
    items: data.items.map((it) => ({
      name: it.productName,
      quantity: it.quantity,
      customizations: it.customizations,
      lineTotalAed: it.lineTotalAed,
    })),
  };
  try {
    await notifyKitchenEmail(payload);
  } catch (e) {
    console.error("[placeOrder] kitchen email failed:", e);
  }
  try {
    await notifyKitchenWhatsApp(payload);
  } catch (e) {
    console.error("[placeOrder] kitchen whatsapp failed:", e);
  }
}
