"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { UUID_RE } from "@/lib/uuid";
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
  product_id: z.string().regex(UUID_RE),
  size_id: z.enum(["small", "regular", "large", "family"]),
  label: z.string().min(1).max(60),
  detail: z.string().max(80).default(""),
  price_aed: z.coerce.number().min(0),
  position: z.coerce.number().int().default(0),
});

const customizationSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  product_id: z.string().regex(UUID_RE),
  ingredient: z.string().min(1).max(120),
  extra_price: z.coerce.number().min(0).nullable().optional(),
  removable: z.coerce.boolean().default(false),
  position: z.coerce.number().int().default(0),
});

function boolFromForm(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

// Smallest-to-largest, so "the price customers see" resolves to the same row the
// storefront prices from: Medium (regular) when the product has it, else the
// smallest available size. Mirrors defaultDisplaySizeId in data/types/catalog.
const SIZE_RANK: Record<string, number> = {
  small: 0,
  regular: 1,
  large: 2,
  family: 3,
};

// products.price_aed is the "base price" the related-item cards, the homepage
// grid, and the SEO tags read — but the menu itself prices every item from its
// size rows. The two used to be editable independently, so an owner could raise
// the base price and watch the menu ignore it (it reads the Medium size). Keep
// the base price mirroring that same displayed size after any size change, so a
// price is set in exactly one place and every surface agrees.
async function syncProductBasePrice(
  supabase: ReturnType<typeof createServiceRoleClient>,
  productId: string,
) {
  const { data: sizes, error } = await supabase
    .from("product_sizes")
    .select("size_id, price_aed")
    .eq("product_id", productId);
  // No rows means the product falls back to its own price_aed as a single
  // "Regular" (see normalizeProductSizes) — leave that seed value untouched.
  if (error || !sizes || sizes.length === 0) return;

  const display =
    sizes.find((size) => size.size_id === "regular") ??
    sizes
      .slice()
      .sort(
        (a, b) => (SIZE_RANK[a.size_id] ?? 99) - (SIZE_RANK[b.size_id] ?? 99),
      )[0];
  if (!display) return;

  const { error: updateError } = await supabase
    .from("products")
    .update({ price_aed: display.price_aed })
    .eq("id", productId);
  if (updateError) logActionError("syncProductBasePrice", updateError);
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

export type ProductActionResult = { error?: string; message?: string };

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

export async function upsertProduct(
  _prevState: ProductActionResult,
  formData: FormData,
): Promise<ProductActionResult> {
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
    return { error: "Please check the item details and try again." };
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
    return { error: "Could not save the item. Please try again." };
  }

  revalidateCatalog();
  return { message: id ? "Item saved." : "Item added." };
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

  await syncProductBasePrice(supabase, payload.product_id);
  revalidateCatalog();
}

export async function deleteSize(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = createServiceRoleClient();
  // Capture the owning product before the row is gone, so the base price can be
  // re-derived from whatever sizes remain.
  const { data: row } = await supabase
    .from("product_sizes")
    .select("product_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("product_sizes").delete().eq("id", id);
  if (error) {
    logActionError("deleteSize", error);
    return;
  }

  if (row?.product_id) await syncProductBasePrice(supabase, row.product_id);
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
