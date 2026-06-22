import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

/** A free-pizza reward issued to a brand-new registrant. */
export interface SignupReward {
  /** The unique single-use promo code to apply at checkout. */
  code: string;
  /** 1-based position among the first N claimants (e.g. claimant #437). */
  claimNumber: number;
  /** Discount value in AED — the chosen pizza's price at claim time. */
  discountAed: number;
  /** Display name of the free pizza. */
  rewardName: string;
}

/** Admin-facing view of the signup campaign configuration. */
export interface SignupCampaign {
  active: boolean;
  maxClaims: number;
  claimsCount: number;
  rewardProductId: string | null;
}

/**
 * Atomically issue a free-pizza code to a new registrant. Returns null when the
 * campaign is off, capped, misconfigured, or this email/phone already claimed —
 * all of which should be silent to the user (no reward, no error). The cap and
 * the email/phone uniqueness are enforced inside the `claim_free_pizza` RPC, so
 * this is race-safe under concurrent signups.
 */
export async function claimSignupFreePizza(input: {
  userId: string | null;
  email: string;
  phone: string;
}): Promise<SignupReward | null> {
  if (!HAS_SUPABASE_SERVICE) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_free_pizza", {
    p_user_id: input.userId,
    p_email: input.email,
    p_phone: input.phone,
  });
  if (error) {
    console.error("[signup-reward] claim failed", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    code: row.code,
    claimNumber: Number(row.claim_number),
    discountAed: Number(row.discount_aed),
    rewardName: row.reward_name,
  };
}

/** Read the singleton campaign config (admin dashboards / page). */
export async function getSignupCampaign(): Promise<SignupCampaign | null> {
  if (!HAS_SUPABASE_SERVICE) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("signup_campaign")
    .select("active, max_claims, claims_count, reward_product_id")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    console.error("[signup-reward] campaign load failed", error);
    return null;
  }
  if (!data) return null;

  return {
    active: data.active,
    maxClaims: Number(data.max_claims),
    claimsCount: Number(data.claims_count),
    rewardProductId: data.reward_product_id,
  };
}
