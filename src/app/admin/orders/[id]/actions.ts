"use server";

import { z } from "zod";
import { UUID_RE } from "@/lib/uuid";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE, HAS_SUPABASE_SERVICE } from "@/lib/env";
import {
  computeOrderTotals,
  describeEdit,
  lineTotal,
  paymentDifference,
  unitPriceFromLine,
  type EditableLine,
  type PaymentHandling,
} from "@/lib/admin/order-edit";

const PAYMENT_HANDLING = [
  "none",
  "cash_collected",
  "cash_refunded",
  "card_manual",
] as const;

const editSchema = z.object({
  orderId: z.string().uuid(),
  deliveryFeeAed: z.coerce.number().min(0).max(9999),
  discountAed: z.coerce.number().min(0).max(99999),
  orderNotes: z.string().max(500).optional(),
  paymentHandling: z.enum(PAYMENT_HANDLING),
  paymentNote: z.string().max(500).optional(),
  addProductId: z.string().regex(UUID_RE).optional(),
  addQuantity: z.coerce.number().int().min(0).max(50).default(0),
});

export interface EditOrderResult {
  error?: string;
  success?: boolean;
}

interface OrderItemRow {
  id: string;
  quantity: number;
  line_total_aed: number | string;
}

/**
 * Edit an order's line quantities, delivery fee, discount and notes. Recomputes
 * subtotal/total, records a payment-difference audit row, and appends a
 * human-readable summary to the order's admin notes.
 *
 * Pragmatic, no DB transaction (a true RPC would need its own migration):
 * the audit row is written FIRST so the change is never silently lost, then the
 * order and its items are updated. Unit prices are re-derived from the stored
 * line — the client never supplies money amounts.
 */
export async function editOrder(formData: FormData): Promise<EditOrderResult> {
  const admin = await requireAdmin();
  if (!HAS_SUPABASE) {
    return { error: "Supabase environment is required to edit orders." };
  }

  const parsed = editSchema.safeParse({
    orderId: formData.get("orderId"),
    deliveryFeeAed: formData.get("deliveryFeeAed"),
    discountAed: formData.get("discountAed"),
    orderNotes: formData.get("orderNotes") || undefined,
    paymentHandling: formData.get("paymentHandling"),
    paymentNote: formData.get("paymentNote") || undefined,
    addProductId: formData.get("addProductId") || undefined,
    addQuantity: formData.get("addQuantity") || 0,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;

  // Prefer the service-role client when configured; otherwise use the
  // authenticated admin client (requireAdmin already passed) so order edits work
  // even when the service-role key isn't set in the deployment.
  const supabase = HAS_SUPABASE_SERVICE
    ? createServiceRoleClient()
    : await createClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_aed, admin_notes, order_items(id, quantity, line_total_aed)",
    )
    .eq("id", data.orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { error: "Order not found." };
  }

  const items = (order.order_items ?? []) as OrderItemRow[];

  // Read new quantity per line from `qty_<itemId>`; re-derive unit price from
  // the stored line so totals can't be tampered with from the client.
  const updates = items.map((item) => {
    const raw = formData.get(`qty_${item.id}`);
    const requested = raw == null ? item.quantity : Number(raw);
    const quantity =
      Number.isFinite(requested) && requested >= 0
        ? Math.floor(requested)
        : item.quantity;
    const unitPriceAed = unitPriceFromLine(
      Number(item.line_total_aed),
      item.quantity,
    );
    return { id: item.id, unitPriceAed, quantity };
  });

  let addProduct:
    | {
        id: string;
        name: string;
        price_aed: number | string;
      }
    | null = null;
  if (data.addProductId && data.addQuantity > 0) {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, name, price_aed")
      .eq("id", data.addProductId)
      .eq("is_active", true)
      .maybeSingle();
    if (productError || !product) {
      return { error: "The item to add is not available." };
    }
    addProduct = product;
  }

  const lines: EditableLine[] = [
    ...updates.map((u) => ({
      unitPriceAed: u.unitPriceAed,
      quantity: u.quantity,
    })),
    ...(addProduct
      ? [
          {
            unitPriceAed: Number(addProduct.price_aed),
            quantity: data.addQuantity,
          },
        ]
      : []),
  ];

  if (lines.every((l) => l.quantity <= 0)) {
    return { error: "An order must keep at least one item." };
  }

  const totals = computeOrderTotals(
    lines,
    data.deliveryFeeAed,
    data.discountAed,
  );
  const oldTotal = Number(order.total_aed);
  const { differenceAed } = paymentDifference(oldTotal, totals.totalAed);

  const summary = describeEdit({
    oldTotalAed: oldTotal,
    newTotalAed: totals.totalAed,
    paymentHandling: data.paymentHandling as PaymentHandling,
    note: data.paymentNote,
  });
  const adminNotes = order.admin_notes
    ? `${order.admin_notes}\n${summary}`
    : summary;

  // 1) Audit first — the source of truth for the change.
  const { error: auditError } = await supabase.from("order_edits").insert({
    order_id: order.id,
    edited_by: admin.id,
    old_total_aed: oldTotal,
    new_total_aed: totals.totalAed,
    difference_aed: differenceAed,
    payment_handling: data.paymentHandling,
    note: data.paymentNote ?? null,
  });
  if (auditError) {
    console.error("[editOrder] audit insert failed:", auditError);
    return { error: "Could not record the edit. Nothing was changed." };
  }

  // 2) Update the order header.
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      subtotal_aed: totals.subtotalAed,
      delivery_fee_aed: totals.deliveryFeeAed,
      discount_aed: totals.discountAed,
      total_aed: totals.totalAed,
      order_notes: data.orderNotes ?? null,
      admin_notes: adminNotes,
    })
    .eq("id", order.id);
  if (updateError) {
    console.error("[editOrder] order update failed:", updateError);
    return { error: "Edit recorded but the order failed to update. Retry." };
  }

  // 3) Apply line changes: drop removed lines, re-price the rest.
  for (const u of updates) {
    if (u.quantity <= 0) {
      await supabase.from("order_items").delete().eq("id", u.id);
      continue;
    }
    await supabase
      .from("order_items")
      .update({
        quantity: u.quantity,
        line_total_aed: lineTotal(u.unitPriceAed, u.quantity),
      })
      .eq("id", u.id);
  }

  if (addProduct && data.addQuantity > 0) {
    await supabase.from("order_items").insert({
      order_id: order.id,
      product_id: addProduct.id,
      product_name: addProduct.name,
      base_price_aed: Number(addProduct.price_aed),
      quantity: data.addQuantity,
      customizations: [],
      line_total_aed: lineTotal(Number(addProduct.price_aed), data.addQuantity),
    });
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${order.id}`);
  return { success: true };
}
