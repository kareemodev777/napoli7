"use server";

import { revalidatePath, refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

const openingHoursSchema = z.object({
  day_of_week: z.coerce.number().int().min(0).max(6),
  // An unchecked checkbox is omitted from the form data entirely, so a missing
  // value must mean "open" (false). Only an explicit "on"/"true" marks the day
  // as closed — otherwise unchecking "Closed all day" would still save as closed.
  is_closed: z
    .preprocess((value) => value === "on" || value === "true" || value === true, z.boolean())
    .default(false),
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

export type OpeningHoursFormState = { ok: boolean; message: string };

export async function upsertOpeningHours(
  _prevState: OpeningHoursFormState,
  formData: FormData,
): Promise<OpeningHoursFormState> {
  try {
    await requireAdmin();
  } catch (error) {
    logActionError("upsertOpeningHours:auth", error);
    return { ok: false, message: "You must be signed in as an admin to edit hours." };
  }

  const input = Object.fromEntries(formData);
  const parsed = openingHoursSchema.safeParse(input);
  if (!parsed.success) {
    logActionError("upsertOpeningHours", parsed.error);
    return { ok: false, message: "Those values look invalid. Check the times and try again." };
  }

  const { day_of_week, is_closed } = parsed.data;
  const opens_at = is_closed ? null : (parsed.data.opens_at || null);
  const closes_at = is_closed ? null : (parsed.data.closes_at || null);
  const note = parsed.data.note?.trim() || null;

  if (!is_closed && (!opens_at || !closes_at)) {
    return {
      ok: false,
      message: "Set both an opening and closing time, or tick “Closed all day”.",
    };
  }

  let supabase: ReturnType<typeof createServiceRoleClient>;
  try {
    supabase = createServiceRoleClient();
  } catch (error) {
    logActionError("upsertOpeningHours:service", error);
    return {
      ok: false,
      message: "Server is missing the Supabase service key, so changes can’t be saved.",
    };
  }

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
    return { ok: false, message: `Could not save: ${error.message}` };
  }

  revalidateOpeningHours();
  return { ok: true, message: "Saved." };
}
