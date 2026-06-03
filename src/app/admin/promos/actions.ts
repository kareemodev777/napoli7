"use server";

import { refresh, revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeCode } from "@/lib/promo";
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

function logActionError(action: string, error: unknown) {
  console.error(`[admin/promos] ${action} failed`, error);
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
