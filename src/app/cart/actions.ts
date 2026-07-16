"use server";

import { z } from "zod";
import { validatePromo, type PromoResult } from "@/lib/promo";
import { getMaxPromoCodesPerOrder } from "@/lib/promo-settings";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

const schema = z.object({
  code: z.string().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

/**
 * Server Action: validate a promo code against the current cart subtotal.
 * Returns `{ code, amount }` on success or `{ error }` for display. The signed-in
 * account is passed so personal reward (free-pizza) codes can be gated to their
 * owner — a guest or the wrong account is rejected early.
 */
export async function validatePromoCode(
  code: string,
  subtotal: number,
): Promise<PromoResult> {
  const parsed = schema.safeParse({ code, subtotal });
  if (!parsed.success) return { error: "Enter a valid promo code." };

  let identity: { userId?: string | null; email?: string | null } | undefined;
  if (HAS_SUPABASE) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      identity = { userId: user?.id ?? null, email: user?.email ?? null };
    } catch {
      // Treat as a guest if the session can't be read.
    }
  }

  return validatePromo(parsed.data.code, parsed.data.subtotal, identity);
}

/**
 * The live "max promo codes per order" cap, for the client promo field. The field
 * lives in the always-mounted cart drawer as well as the cart and checkout pages,
 * so it reads the value itself rather than having it threaded down as a prop. The
 * server order action re-checks the cap, so this is only to keep the UI honest.
 */
export async function loadMaxPromoCodesPerOrder(): Promise<number> {
  return getMaxPromoCodesPerOrder();
}
