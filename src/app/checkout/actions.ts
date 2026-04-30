"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyKitchenEmail } from "@/lib/notifications/email";
import { notifyKitchenWhatsApp } from "@/lib/notifications/whatsapp";
import { HAS_SUPABASE } from "@/lib/env";

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
    .regex(/^\+971[0-9]{8,9}$/, "Enter a valid UAE mobile number starting with +971"),
  email: z.string().email(),
  deliveryType: z.enum(["delivery", "pickup"]),
  deliveryAddress: deliveryAddressSchema.optional(),
  deliverySlot: z.string().min(1),
  orderNotes: z.string().max(500).optional(),
  paymentMethod: z.enum(["cod", "card"]),
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
      error: parsed.error.issues[0]?.message ?? "Some fields are missing or invalid.",
    };
  }
  const data = parsed.data;
  if (data.deliveryType === "delivery" && !data.deliveryAddress) {
    return { error: "Add a delivery address or switch to pickup." };
  }

  const subtotal = data.items.reduce((s, i) => s + i.lineTotalAed, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  if (!HAS_SUPABASE) {
    const orderId = crypto.randomUUID();
    const orderNumber = `N7-DEMO-${Date.now().toString().slice(-5)}`;
    console.info(
      `[placeOrder] Supabase disabled. Demo order ${orderNumber} (${total.toFixed(2)} AED) for ${data.firstName} ${data.lastName}`
    );
    await runNotifications({ data, orderId, orderNumber, total });
    if (data.paymentMethod === "card") {
      return {
        orderId,
        orderNumber,
        error: "Card payment requires Stripe + Supabase env vars. Choose Cash on Delivery for now.",
      };
    }
    return { orderId, orderNumber };
  }

  const supabase = await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_name: `${data.firstName} ${data.lastName}`,
      customer_phone: data.phone,
      customer_email: data.email,
      delivery_type: data.deliveryType,
      delivery_address:
        data.deliveryType === "delivery" ? data.deliveryAddress : null,
      delivery_slot: data.deliverySlot,
      order_notes: data.orderNotes ?? null,
      payment_method: data.paymentMethod,
      payment_status: data.paymentMethod === "card" ? "pending" : "pending",
      subtotal_aed: subtotal,
      delivery_fee_aed: deliveryFee,
      total_aed: total,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[placeOrder] Order insert failed:", orderError);
    return {
      error: "We could not place your order. Please try again or call us on +971 6 534 5772.",
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
  const { error: itemsError } = await supabase.from("order_items").insert(itemRows);
  if (itemsError) {
    console.error("[placeOrder] Order items insert failed:", itemsError);
  }

  await runNotifications({
    data,
    orderId: order.id,
    orderNumber: order.order_number,
    total,
  });

  if (data.paymentMethod === "card") {
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      paymentUrl: `/api/checkout/create-session?orderId=${order.id}`,
    };
  }

  revalidatePath("/account/orders");
  redirect(`/order/${order.id}/confirmation`);
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
