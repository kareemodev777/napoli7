"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

const trackSchema = z.object({
  orderId: z.string().min(4),
  phone: z.string().min(8),
});

export interface TrackedOrder {
  id: string;
  orderNumber: string;
  status:
    | "received"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  deliveryType: "delivery" | "pickup";
  deliverySlot: string;
  createdAt: string;
  /** Normalised phone the order was matched on — used by the status poller. */
  phone: string;
}

export interface TrackOrderResult {
  order?: TrackedOrder;
  error?: string;
}

export async function trackOrder(
  _prev: TrackOrderResult,
  formData: FormData,
): Promise<TrackOrderResult> {
  const parsed = trackSchema.safeParse({
    orderId: String(formData.get("orderId") ?? "").trim(),
    phone: String(formData.get("phone") ?? "")
      .trim()
      .replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    return { error: "Enter a valid order ID and phone number." };
  }

  if (!HAS_SUPABASE) {
    return {
      error:
        "Live order tracking activates once Supabase is configured. Demo orders are not stored.",
    };
  }

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, created_at, delivery_slot, delivery_type, customer_phone",
    )
    .or(
      `id.eq.${parsed.data.orderId},order_number.ilike.${parsed.data.orderId}`,
    )
    .eq("customer_phone", parsed.data.phone)
    .maybeSingle();

  if (!order) {
    return {
      error:
        "No order found with those details. Check your order ID and phone number.",
    };
  }

  return {
    order: {
      id: order.id,
      orderNumber: order.order_number,
      status: order.status,
      deliveryType: order.delivery_type,
      deliverySlot: order.delivery_slot,
      createdAt: order.created_at,
      phone: parsed.data.phone,
    },
  };
}
