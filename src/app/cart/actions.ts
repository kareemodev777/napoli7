"use server";

import { z } from "zod";
import { validatePromo, type PromoResult } from "@/lib/promo";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

/**
 * Server Action: validate a promo code against the current cart subtotal.
 * Returns `{ code, amount }` on success or `{ error }` for display.
 */
export async function validatePromoCode(
  code: string,
  subtotal: number,
): Promise<PromoResult> {
  const parsed = schema.safeParse({ code, subtotal });
  if (!parsed.success) return { error: "Enter a valid promo code." };
  return validatePromo(parsed.data.code, parsed.data.subtotal);
}
