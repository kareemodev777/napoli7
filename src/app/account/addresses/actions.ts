"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  street: z.string().trim().min(3).max(160),
  area: z.string().trim().min(2).max(80),
  flat: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(240).optional(),
  isDefault: z.boolean(),
});

export async function addAddress(formData: FormData) {
  const user = await requireCustomerAccount("/account/addresses");
  const parsed = addressSchema.safeParse({
    label: formData.get("label"),
    street: formData.get("street"),
    area: formData.get("area"),
    flat: formData.get("flat") || undefined,
    notes: formData.get("notes") || undefined,
    isDefault: formData.get("isDefault") === "on",
  });

  if (!parsed.success) return;

  const supabase = await createClient();

  // The first address a customer saves is always their default — there's
  // nothing else to deliver to. After that, respect the checkbox.
  const { count } = await supabase
    .from("saved_addresses")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  const isFirst = (count ?? 0) === 0;
  const makeDefault = isFirst || parsed.data.isDefault;

  if (makeDefault) {
    await supabase
      .from("saved_addresses")
      .update({ is_default: false })
      .eq("user_id", user.id);
  }

  await supabase.from("saved_addresses").insert({
    user_id: user.id,
    label: parsed.data.label,
    street: parsed.data.street,
    area: parsed.data.area,
    flat: parsed.data.flat || null,
    notes: parsed.data.notes || null,
    is_default: makeDefault,
  });

  revalidatePath("/account/addresses");
}

export async function deleteAddress(formData: FormData) {
  const user = await requireCustomerAccount("/account/addresses");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("saved_addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/account/addresses");
}

export async function makeDefaultAddress(formData: FormData) {
  const user = await requireCustomerAccount("/account/addresses");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("saved_addresses")
    .update({ is_default: false })
    .eq("user_id", user.id);
  await supabase
    .from("saved_addresses")
    .update({ is_default: true })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/account/addresses");
}
