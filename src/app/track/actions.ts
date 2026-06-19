"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";
import { isUuid } from "@/lib/order-lookup";

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
  const lookup = parsed.data.orderId;
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, created_at, delivery_slot, delivery_type, customer_phone",
    )
    .eq("customer_phone", parsed.data.phone);
  // Only match the uuid `id` column when the input is actually a uuid; otherwise
  // an order-number lookup (the normal case) would crash the query. See isUuid.
  query = isUuid(lookup)
    ? query.or(`id.eq.${lookup},order_number.ilike.${lookup}`)
    : query.ilike("order_number", lookup);
  const { data: order, error } = await query.maybeSingle();

  if (error) {
    console.error("[trackOrder] lookup failed:", error);
  }

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
