"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { canonicalizeCheckoutCart } from "@/lib/checkout-pricing";
import { resolveDeliveryFee } from "@/lib/checkout";
import {
  computeOrderFeesAed,
  getDeliveryOrderTotalAed,
} from "@/lib/delivery-settings";
import { placeholderEmailForPhone } from "@/lib/auth/placeholder-email";
import { sendKitchenNotificationsForOrder } from "@/lib/notifications/kitchen";
import { pushOrderToPos } from "@/lib/pos/push";

const manualItemSchema = z.object({
  productId: z.string().uuid(),
  sizeId: z.enum(["small", "regular", "large", "family"]),
  quantity: z.number().int().min(1).max(50),
});

const manualOrderSchema = z.object({
  customerName: z.string().trim().min(1, "Enter the customer's name."),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+971[0-9]{8,9}$/, "Enter a UAE mobile starting with +971."),
  deliveryType: z.enum(["delivery", "pickup"]),
  street: z.string().trim().optional(),
  area: z.string().trim().optional(),
  flat: z.string().trim().optional(),
  addressNotes: z.string().trim().optional(),
  paymentMethod: z.enum(["cod", "card"]),
  orderNotes: z.string().trim().optional(),
  items: z.array(manualItemSchema).min(1, "Add at least one item."),
});

export interface ManualOrderResult {
  error?: string;
  success?: boolean;
  orderId?: string;
  orderNumber?: string;
}

/**
 * Take an order over the phone.
 *
 * The row it writes is an ordinary order — same table, same `N7-…` number from
 * the same sequence, same POS push, same kitchen alarm — so it prepares, assigns
 * a rider and tracks exactly like one placed on the website. The only thing that
 * differs is who typed it.
 *
 * Prices are NEVER taken from the form. The staff pick a product and a size, and
 * the price is read from the catalogue by the same canonicalizer the website
 * uses. A phone order cannot be mispriced by a typo, and staff cannot quietly
 * discount one.
 *
 * Unlike the website, no GPS pin is required. The 7 km / Ajman gate exists because
 * a stranger on the internet cannot be trusted to know whether we deliver to them.
 * On the phone, someone is asking — the address is vetted by a human, and refusing
 * the order because a map pin is missing would be absurd.
 */
export async function createManualOrder(
  input: unknown,
): Promise<ManualOrderResult> {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorised." };

  const parsed = manualOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const data = parsed.data;

  if (data.deliveryType === "delivery" && !data.street) {
    return { error: "A delivery order needs a street address." };
  }

  const supabase = await createClient();

  // Price from the catalogue, not from the form.
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select(
      "id, name, price_aed, is_active, is_temporarily_unavailable, product_sizes(size_id, label, price_aed), product_customizations(ingredient, extra_price, removable)",
    )
    .in("id", productIds);

  if (productError || !products) {
    return { error: "Could not load the menu. Try again." };
  }

  const canonical = canonicalizeCheckoutCart(
    data.items.map((item) => ({
      productId: item.productId,
      productName: "",
      sizeId: item.sizeId,
      quantity: item.quantity,
      customizations: [],
    })),
    products.map((product) => ({
      id: product.id,
      name: product.name,
      priceAed: Number(product.price_aed),
      isActive: Boolean(product.is_active),
      isTemporarilyUnavailable: Boolean(product.is_temporarily_unavailable),
      sizes: (product.product_sizes ?? []).map(
        (s: { size_id: string; label: string; price_aed: number | string }) => ({
          sizeId: s.size_id,
          label: s.label,
          priceAed: Number(s.price_aed),
        }),
      ),
      customizations: (product.product_customizations ?? []).map(
        (c: {
          ingredient: string;
          extra_price: number | string | null;
          removable: boolean;
        }) => ({
          ingredient: c.ingredient,
          extraPrice: c.extra_price == null ? null : Number(c.extra_price),
          removable: Boolean(c.removable),
        }),
      ),
    })),
  );

  if (!canonical.ok) return { error: canonical.error };

  const subtotal = canonical.subtotalAed;

  // Fees follow the same rules as the website: 9 + 3 on delivery, free delivery
  // over 80 (the service fee stands), pickup pays neither.
  let zoneFee = 0;
  if (data.deliveryType === "delivery") {
    const zone = await resolveDeliveryFee(data.area ?? "");
    // An unlisted area does not block a phone order — the staff know where it is.
    // Fall back to the standard fee rather than refusing a paying customer.
    zoneFee = zone.supported ? zone.fee : 9;
  }
  const { deliveryFeeAed, serviceFeeAed } = computeOrderFeesAed({
    deliveryType: data.deliveryType,
    subtotalAed: subtotal,
    zoneFeeAed: zoneFee,
  });
  const total = getDeliveryOrderTotalAed({
    subtotalAed: subtotal,
    deliveryFeeAed,
    serviceFeeAed,
  });

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: null,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      // Phone customers give no email; the placeholder keeps the NOT NULL column
      // honest and is never mailed.
      customer_email: placeholderEmailForPhone(data.customerPhone),
      delivery_type: data.deliveryType,
      delivery_address:
        data.deliveryType === "delivery"
          ? {
              street: data.street,
              area: data.area ?? "",
              flat: data.flat ?? "",
              notes: data.addressNotes ?? "",
            }
          : null,
      delivery_slot: "ASAP",
      order_notes: data.orderNotes ?? null,
      payment_method: data.paymentMethod,
      payment_status: "pending",
      subtotal_aed: subtotal,
      delivery_fee_aed: deliveryFeeAed,
      service_fee_aed: serviceFeeAed,
      discount_aed: 0,
      total_aed: total,
      admin_notes: `Taken by phone by ${admin.email ?? "admin"}.`,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[createManualOrder] insert failed:", orderError);
    return { error: "Could not create the order. Try again." };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    canonical.items.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      base_price_aed: item.basePriceAed,
      quantity: item.quantity,
      customizations: item.customizations,
      line_total_aed: item.lineTotalAed,
      size_label: item.sizeLabel,
    })),
  );
  if (itemsError) {
    console.error("[createManualOrder] items insert failed:", itemsError);
  }

  // A phone order is fulfilled immediately, whatever the payment method. The
  // website defers a card order until Stripe calls back, but there is no Stripe
  // session here — the customer pays the driver or at the counter — so waiting
  // for a callback that will never come would strand the order out of the kitchen.
  try {
    await sendKitchenNotificationsForOrder(order.id);
  } catch (e) {
    console.error("[createManualOrder] kitchen notification failed:", e);
  }
  try {
    await pushOrderToPos(order.id);
  } catch (e) {
    console.error("[createManualOrder] POS push failed:", e);
  }

  revalidatePath("/admin/orders");
  return {
    success: true,
    orderId: order.id,
    orderNumber: order.order_number,
  };
}
