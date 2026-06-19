"use server";

import { revalidatePath, refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const openingHoursSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  is_closed: z.coerce.boolean().default(true),
  opens_at: z.string().max(5).optional().or(z.literal("")),
  closes_at: z.string().max(5).optional().or(z.literal("")),
  note: z.string().max(200).optional().or(z.literal("")),
});

function revalidateOpeningHours() {
  revalidatePath("/admin/opening-hours");
  revalidatePath("/menu");
  revalidatePath("/checkout");
  revalidatePath("/location");
  revalidatePath("/");
  refresh();
}

function logActionError(action: string, error: unknown) {
  console.error(`[admin/opening-hours] ${action} failed`, error);
}

export async function upsertOpeningHours(formData: FormData) {
  await requireAdmin();
  const input = Object.fromEntries(formData);
  const parsed = openingHoursSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertOpeningHours", parsed.error);
    return;
  }

  const { day_of_week, is_closed } = parsed.data;
  const opens_at = is_closed ? null : (parsed.data.opens_at || null);
  const closes_at = is_closed ? null : (parsed.data.closes_at || null);
  const note = parsed.data.note?.trim() || null;

  if (!is_closed && (!opens_at || !closes_at)) {
    return;
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("opening_hours").upsert({
    day_of_week,
    is_closed,
    opens_at,
    closes_at,
    note,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    logActionError("upsertOpeningHours", error);
    return;
  }

  revalidateOpeningHours();
}
