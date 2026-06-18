"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const categorySchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  description: z.string().max(500).default(""),
  position: z.coerce.number().int().default(0),
});

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  slug: z.string().min(1).max(120),
  category_id: z.string().min(1),
  name: z.string().min(1).max(120),
  name_it: z.string().max(120).optional(),
  description: z.string().min(1).max(1200),
  price_aed: z.coerce.number().min(0),
  image_url: z.string().min(1).max(500),
  position: z.coerce.number().int().default(0),
  is_veg: z.coerce.boolean().default(false),
  is_spicy: z.coerce.boolean().default(false),
  is_active: z.coerce.boolean().default(false),
  is_temporarily_unavailable: z.coerce.boolean().default(false),
});

const sizeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  product_id: z.string().uuid(),
  size_id: z.enum(["small", "regular", "large", "family"]),
  label: z.string().min(1).max(60),
  detail: z.string().max(80).default(""),
  price_aed: z.coerce.number().min(0),
  position: z.coerce.number().int().default(0),
});

const customizationSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  product_id: z.string().uuid(),
  ingredient: z.string().min(1).max(120),
  extra_price: z.coerce.number().min(0).nullable().optional(),
  removable: z.coerce.boolean().default(false),
  position: z.coerce.number().int().default(0),
});

function boolFromForm(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function revalidateCatalog() {
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/catalog/[id]", "page");
  revalidatePath("/menu");
  revalidatePath("/menu/[slug]", "page");
  revalidatePath("/sitemap.xml");
  refresh();
}

function logActionError(action: string, error: unknown) {
  console.error(`[admin/catalog] ${action} failed`, error);
}

export async function upsertCategory(formData: FormData) {
  await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    logActionError("upsertCategory", parsed.error);
    return;
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("categories").upsert(parsed.data);
  if (error) {
    logActionError("upsertCategory", error);
    return;
  }

  revalidateCatalog();
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    logActionError("deleteCategory", error);
    return;
  }

  revalidateCatalog();
}

export async function upsertProduct(formData: FormData) {
  await requireAdmin();
  const input = {
    ...Object.fromEntries(formData),
    is_veg: boolFromForm(formData, "is_veg"),
    is_spicy: boolFromForm(formData, "is_spicy"),
    is_active: boolFromForm(formData, "is_active"),
    is_temporarily_unavailable: boolFromForm(
      formData,
      "is_temporarily_unavailable",
    ),
  };
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertProduct", parsed.error);
    return;
  }

  const { id, name_it, ...rest } = parsed.data;
  const payload = {
    ...rest,
    name_it: name_it?.trim() ? name_it : null,
  };

  const supabase = createServiceRoleClient();
  const query = id
    ? supabase.from("products").update(payload).eq("id", id)
    : supabase.from("products").insert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertProduct", error);
    return;
  }

  revalidateCatalog();
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) {
    logActionError("deleteProduct", error);
    return;
  }

  revalidateCatalog();
}

export async function upsertSize(formData: FormData) {
  await requireAdmin();
  const parsed = sizeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    logActionError("upsertSize", parsed.error);
    return;
  }

  const { id, ...payload } = parsed.data;
  const supabase = createServiceRoleClient();
  const query = id
    ? supabase.from("product_sizes").update(payload).eq("id", id)
    : supabase.from("product_sizes").insert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertSize", error);
    return;
  }

  revalidateCatalog();
}

export async function deleteSize(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("product_sizes").delete().eq("id", id);
  if (error) {
    logActionError("deleteSize", error);
    return;
  }

  revalidateCatalog();
}

export async function upsertCustomization(formData: FormData) {
  await requireAdmin();
  const input = {
    ...Object.fromEntries(formData),
    removable: boolFromForm(formData, "removable"),
    extra_price:
      String(formData.get("extra_price") ?? "").trim() === ""
        ? null
        : formData.get("extra_price"),
  };
  const parsed = customizationSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertCustomization", parsed.error);
    return;
  }

  const { id, ...payload } = parsed.data;
  const supabase = createServiceRoleClient();
  const query = id
    ? supabase.from("product_customizations").update(payload).eq("id", id)
    : supabase.from("product_customizations").insert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertCustomization", error);
    return;
  }

  revalidateCatalog();
}

export async function deleteCustomization(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("product_customizations")
    .delete()
    .eq("id", id);
  if (error) {
    logActionError("deleteCustomization", error);
    return;
  }

  revalidateCatalog();
}
