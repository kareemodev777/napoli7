"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { UUID_RE } from "@/lib/uuid";
import { normalizeCode } from "@/lib/promo";
import { normalizeMaxPromoCodesPerOrder } from "@/lib/promo-settings";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const promoSchema = z
  .object({
    originalCode: z.string().optional().or(z.literal("")),
    code: z.string().min(2).max(40),
    discount_type: z.enum(["pct", "aed"]),
    discount_value: z.coerce.number().positive(),
    min_subtotal_aed: z.coerce.number().min(0).default(0),
    valid_from: z.string().optional().or(z.literal("")),
    valid_until: z.string().optional().or(z.literal("")),
    max_uses: z.string().optional().or(z.literal("")),
    active: z.coerce.boolean().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.discount_type === "pct" && value.discount_value > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["discount_value"],
        message: "Percentage discounts must be 100 or less.",
      });
    }
  });

function boolFromForm(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function nullableString(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}

function nullableInt(value?: string | null) {
  const trimmed = (value ?? "").trim();
  return trimmed ? Number.parseInt(trimmed, 10) : null;
}

function revalidatePromos() {
  revalidatePath("/admin/promos");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  refresh();
}

const campaignSchema = z.object({
  active: z.coerce.boolean().default(false),
  reward_product_id: z.string().regex(UUID_RE).optional().or(z.literal("")),
  max_claims: z.coerce.number().int().positive().max(1_000_000),
});

/** Configure the "free pizza for the first N registrants" signup campaign. */
export async function updateSignupCampaign(formData: FormData) {
  await requireAdmin();
  const parsed = campaignSchema.safeParse({
    ...Object.fromEntries(formData),
    active: boolFromForm(formData, "active"),
  });
  if (!parsed.success) {
    logActionError("updateSignupCampaign", parsed.error);
    return;
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("signup_campaign")
    .update({
      active: parsed.data.active,
      reward_product_id: nullableString(parsed.data.reward_product_id),
      max_claims: parsed.data.max_claims,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    logActionError("updateSignupCampaign", error);
    return;
  }

  revalidatePath("/admin/promos");
  revalidatePath("/register");
  refresh();
}

function logActionError(action: string, error: unknown) {
  console.error(`[admin/promos] ${action} failed`, error);
}

/**
 * Set how many promo codes one order may stack. Stored in the shared
 * delivery_settings key/value table; read by the cart, checkout, and the order
 * guard. The value is clamped to a whole number in [1, hard cap] before saving.
 */
export async function updateMaxPromoCodesPerOrder(formData: FormData) {
  await requireAdmin();
  const parsedValue = Number(formData.get("maxPromoCodesPerOrder"));
  if (!Number.isFinite(parsedValue)) {
    logActionError(
      "updateMaxPromoCodesPerOrder",
      new Error("Invalid max promo codes value"),
    );
    return;
  }

  const value = normalizeMaxPromoCodesPerOrder(parsedValue);
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("delivery_settings").upsert({
    key: "max_promo_codes_per_order",
    value,
  });
  if (error) {
    logActionError("updateMaxPromoCodesPerOrder", error);
    return;
  }

  revalidatePromos();
}

export async function upsertPromo(formData: FormData) {
  await requireAdmin();
  const input = {
    ...Object.fromEntries(formData),
    active: boolFromForm(formData, "active"),
  };
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertPromo", parsed.error);
    return;
  }

  const {
    originalCode,
    code,
    discount_type,
    discount_value,
    min_subtotal_aed,
    valid_from,
    valid_until,
    max_uses,
    active,
  } = parsed.data;

  const normalizedCode = normalizeCode(code);
  const normalizedOriginal = normalizeCode(originalCode ?? "");
  const payload = {
    code: normalizedCode,
    discount_pct: discount_type === "pct" ? discount_value : null,
    discount_aed: discount_type === "aed" ? discount_value : null,
    min_subtotal_aed,
    valid_from: nullableString(valid_from),
    valid_until: nullableString(valid_until),
    max_uses: nullableInt(max_uses),
    active,
  };

  const supabase = createServiceRoleClient();
  const query = normalizedOriginal
    ? supabase.from("promo_codes").update(payload).eq("code", normalizedOriginal)
    : supabase.from("promo_codes").upsert(payload);
  const { error } = await query;
  if (error) {
    logActionError("upsertPromo", error);
    return;
  }

  revalidatePromos();
}

export async function deletePromo(formData: FormData) {
  await requireAdmin();
  const code = normalizeCode(String(formData.get("code") ?? ""));
  if (!code) return;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("promo_codes").delete().eq("code", code);
  if (error) {
    logActionError("deletePromo", error);
    return;
  }

  revalidatePromos();
}
