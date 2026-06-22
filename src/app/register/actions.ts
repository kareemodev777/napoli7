"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE, SITE_URL } from "@/lib/env";
import { claimSignupFreePizza, type SignupReward } from "@/lib/signup-reward";
import { notifyFreePizzaRewardEmail } from "@/lib/notifications/email";

const registerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    mobile: z
      .string()
      .trim()
      .regex(
        /^\+9715\d{8}$/,
        "Enter a valid UAE mobile number starting with +9715.",
      ),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export interface RegisterResult {
  error?: string;
  message?: string;
  /** Present when this new registrant claimed a launch free-pizza reward. */
  reward?: SignupReward;
}

export async function registerCustomer(
  _prev: RegisterResult,
  formData: FormData,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    mobile: formData.get("mobile"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Some fields are missing.",
    };
  }
  if (!HAS_SUPABASE) {
    return {
      error: "Registration activates once Supabase is configured. See README.",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${SITE_URL}/login?confirmed=true`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        mobile: parsed.data.mobile,
      },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return {
        error: "An account with this email already exists. Log in instead.",
      };
    }
    return { error: error.message };
  }

  // Launch promo: issue a free-pizza code to genuinely new registrants. Bound to
  // email + phone so it can't be re-claimed by swapping one of them. Silent when
  // the campaign is off, capped, or this identity already claimed — never blocks
  // or fails the registration itself.
  let reward: SignupReward | undefined;
  try {
    const claimed = await claimSignupFreePizza({
      userId: data.user?.id ?? null,
      email: parsed.data.email,
      phone: parsed.data.mobile,
    });
    if (claimed) {
      reward = claimed;
      await notifyFreePizzaRewardEmail({
        to: parsed.data.email,
        firstName: parsed.data.firstName,
        code: claimed.code,
        rewardName: claimed.rewardName,
        claimNumber: claimed.claimNumber,
      }).catch((e) => console.error("[register] reward email failed", e));
    }
  } catch (e) {
    console.error("[register] free-pizza claim failed", e);
  }

  return {
    message: "Check your inbox to confirm your email.",
    reward,
  };
}
