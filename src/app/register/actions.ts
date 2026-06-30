"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  HAS_SUPABASE,
  HAS_SUPABASE_SERVICE,
  HAS_TWILIO,
  SITE_URL,
} from "@/lib/env";
import { buildEmailVerificationRedirect } from "@/lib/auth/registration";
import { isLikelyFakePhone } from "@/lib/auth/phone";
import {
  startPhoneVerification,
  checkPhoneVerification,
} from "@/lib/notifications/verify";
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

export type RegisterInput = z.infer<typeof registerSchema>;

export interface SendOtpResult {
  ok?: boolean;
  error?: string;
}

export interface RegisterResult {
  ok?: boolean;
  error?: string;
  /** Present when this new registrant claimed a launch free-pizza reward. */
  reward?: SignupReward;
}

/** Validate identity + anti-abuse, then bail with a clear reason if blocked. */
async function screenIdentity(
  data: RegisterInput,
): Promise<{ error: string } | null> {
  // Layer 1 (instant): reject obviously fake numbers.
  if (isLikelyFakePhone(data.mobile)) {
    return { error: "Enter a real UAE mobile number." };
  }
  // Reject identities already tied to an account so the launch offer can't be
  // farmed by re-using one phone (or email) across throwaway signups.
  if (HAS_SUPABASE_SERVICE) {
    try {
      const service = createServiceRoleClient();
      const [phoneRes, emailRes] = await Promise.all([
        service.rpc("phone_already_registered", { p_phone: data.mobile }),
        service.rpc("email_already_registered", { p_email: data.email }),
      ]);
      if (emailRes.data) {
        return {
          error: "An account with this email already exists. Log in instead.",
        };
      }
      if (phoneRes.data) {
        return {
          error:
            "This mobile number is already linked to an account. Log in instead.",
        };
      }
    } catch (e) {
      console.error("[register] identity dup check threw", e);
    }
  }
  return null;
}

/**
 * Step 1: validate, run the anti-abuse checks, then text a 6-digit code via
 * Twilio. The code is stored hashed with a short TTL so we never persist the
 * plaintext, and a per-number cooldown blocks SMS spam. No account is created
 * here — that happens once the code is verified (see {@link verifyAndRegister}).
 */
export async function sendRegistrationOtp(
  input: unknown,
): Promise<SendOtpResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Some fields are missing.",
    };
  }
  if (!HAS_SUPABASE || !HAS_SUPABASE_SERVICE) {
    return {
      error: "Registration activates once Supabase is configured. See README.",
    };
  }

  const blocked = await screenIdentity(parsed.data);
  if (blocked) return blocked;

  // Twilio Verify owns the code, its TTL, and resend rate-limiting, and routes
  // through senders that reach UAE numbers. When Twilio isn't configured this
  // is a dev no-op (the form would use registerDirect anyway).
  if (HAS_TWILIO) {
    const started = await startPhoneVerification(parsed.data.mobile);
    if (!started.sent) {
      return {
        error: started.reason ?? "We couldn't text that number. Check it and try again.",
      };
    }
  }
  return { ok: true };
}

/**
 * Step 2: verify the texted code, then create the account with the standard
 * email sign-up (keeping the verify-email flow) and issue the launch reward.
 * The code is single-use and attempt-limited; identity dup checks run again
 * right before creation for race-safety.
 */
export async function verifyAndRegister(
  input: unknown,
  code: string,
): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Some fields are missing.",
    };
  }
  if (!HAS_SUPABASE || !HAS_SUPABASE_SERVICE) {
    return {
      error: "Registration activates once Supabase is configured. See README.",
    };
  }

  // Verify the texted code with Twilio Verify (single-use, attempt-limited and
  // expiry all enforced by Twilio). Skipped when Twilio isn't configured (dev).
  if (HAS_TWILIO) {
    const check = await checkPhoneVerification(parsed.data.mobile, code);
    if (!check.approved) {
      return { error: check.reason ?? "That code didn't match. Request a new one." };
    }
  }

  return createAccountAndClaim(parsed.data);
}

/**
 * Direct registration with NO SMS step — used when OTP is disabled (Twilio not
 * configured, or explicitly turned off). The fake-number and duplicate
 * email/phone guards still apply, so a missing SMS config relaxes verification
 * without removing the anti-abuse checks or blocking anyone.
 */
export async function registerDirect(input: unknown): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
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
  if (isLikelyFakePhone(parsed.data.mobile)) {
    return { error: "Enter a real UAE mobile number." };
  }
  return createAccountAndClaim(parsed.data);
}

/**
 * Create the account (standard email sign-up → keeps the verify-email flow) and
 * issue the launch free-pizza reward. Re-screens identity right before creation
 * for race-safety. Shared by the OTP and the direct (no-OTP) paths.
 */
async function createAccountAndClaim(
  data: RegisterInput,
): Promise<RegisterResult> {
  const blocked = await screenIdentity(data);
  if (blocked) return blocked;

  const supabase = await createClient();
  const { data: signUp, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      emailRedirectTo: buildEmailVerificationRedirect(SITE_URL, data.email),
      data: {
        first_name: data.firstName,
        last_name: data.lastName,
        mobile: data.mobile,
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

  // Launch offer — deduped on email + phone in the RPC.
  try {
    const claimed = await claimSignupFreePizza({
      userId: signUp.user?.id ?? null,
      email: data.email,
      phone: data.mobile,
    });
    if (claimed) {
      await notifyFreePizzaRewardEmail({
        to: data.email,
        firstName: data.firstName,
        code: claimed.code,
        rewardName: claimed.rewardName,
        claimNumber: claimed.claimNumber,
      }).catch((e: unknown) =>
        console.error("[register] reward email failed", e),
      );
      return { ok: true, reward: claimed };
    }
  } catch (e: unknown) {
    console.error("[register] free-pizza claim failed", e);
  }

  return { ok: true };
}
