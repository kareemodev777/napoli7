"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { normalizeDeliveryMinimumSubtotalAed } from "@/lib/delivery-settings";

const zoneSchema = z.object({
  // original area name for renaming the PK; empty = insert
  originalArea: z.string().max(120).optional().or(z.literal("")),
  area: z.string().min(2).max(120),
  fee_aed: z.coerce.number().min(0),
  position: z.coerce.number().int().default(0),
  active: z.coerce.boolean().default(true),
});

function boolFromForm(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateDeliverySettings() {
  revalidatePath("/admin/delivery-zones");
  revalidatePath("/checkout");
  refresh();
}

function logActionError(action: string, error: unknown) {
  console.error(`[admin/delivery-zones] ${action} failed`, error);
}

export async function upsertZone(formData: FormData) {
  await requireAdmin();
  const input = {
    ...Object.fromEntries(formData),
    active: boolFromForm(formData, "active"),
  };
  const parsed = zoneSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertZone", parsed.error);
    return;
  }

  const { originalArea, area, fee_aed, position, active } = parsed.data;
  const payload = { area, fee_aed, position, active };

  const supabase = createServiceRoleClient();
  // Renaming the primary key: update the existing row keyed by its old name.
  const query =
    originalArea && originalArea !== area
      ? supabase.from("delivery_zones").update(payload).eq("area", originalArea)
      : supabase.from("delivery_zones").upsert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertZone", error);
    return;
  }

  revalidateDeliverySettings();
}

export async function updateDeliveryMinimumSubtotal(formData: FormData) {
  await requireAdmin();
  const raw = formData.get("deliveryMinSubtotalAed");
  const parsedValue = Number(raw);
  if (!Number.isFinite(parsedValue)) {
    logActionError("updateDeliveryMinimumSubtotal", new Error("Invalid minimum subtotal"));
    return;
  }

  const deliveryMinSubtotalAed = normalizeDeliveryMinimumSubtotalAed(parsedValue);
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("delivery_settings").upsert({
    key: "delivery_min_subtotal_aed",
    value: deliveryMinSubtotalAed,
  });
  if (error) {
    logActionError("updateDeliveryMinimumSubtotal", error);
    return;
  }

  revalidateDeliverySettings();
}

export async function deleteZone(formData: FormData) {
  await requireAdmin();
  const area = String(formData.get("area") ?? "");
  if (!area) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("area", area);
  if (error) {
    logActionError("deleteZone", error);
    return;
  }

  revalidateDeliverySettings();
}
