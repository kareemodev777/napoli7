"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const riderSchema = z.object({
  // present = update an existing rider; empty = insert a new one
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  vehicle: z.string().max(80).optional().or(z.literal("")),
  is_active: z.coerce.boolean().default(true),
});

function logActionError(action: string, error: unknown) {
  console.error(`[admin/riders] ${action} failed`, error);
}

export async function upsertRider(formData: FormData) {
  await requireAdmin();
  const parsed = riderSchema.safeParse({
    ...Object.fromEntries(formData),
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    logActionError("upsertRider", parsed.error);
    return;
  }

  const { id, name, phone, vehicle, is_active } = parsed.data;
  const payload = { name, phone, vehicle: vehicle || null, is_active };

  const supabase = createServiceRoleClient();
  const query = id
    ? supabase.from("riders").update(payload).eq("id", id)
    : supabase.from("riders").insert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertRider", error);
    return;
  }

  revalidatePath("/admin/riders");
}

export async function setRiderActive(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("is_active") === "true";
  if (!id) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("riders")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) {
    logActionError("setRiderActive", error);
    return;
  }

  revalidatePath("/admin/riders");
}

export async function deleteRider(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // assigned_rider_id is ON DELETE SET NULL, so deleting a rider unassigns them
  // from any orders rather than removing order history.
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("riders").delete().eq("id", id);
  if (error) {
    logActionError("deleteRider", error);
    return;
  }

  revalidatePath("/admin/riders");
  revalidatePath("/admin/orders");
}
