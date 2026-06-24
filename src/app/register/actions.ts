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
import { isLikelyFakePhone, normalizePhone } from "@/lib/auth/phone";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  generateOtpCode,
  hashOtpCode,
  verifyOtpHash,
} from "@/lib/auth/otp";
import { sendSms } from "@/lib/notifications/sms";
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

export type { SignupReward };

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

  const phoneNorm = normalizePhone(parsed.data.mobile);
  const service = createServiceRoleClient();

  // Anti-spam cooldown: don't text the same number again within the window.
  const { data: existing } = await service
    .from("phone_otps")
    .select("last_sent_at")
    .eq("phone_norm", phoneNorm)
    .maybeSingle();
  if (
    existing &&
    Date.now() - new Date(existing.last_sent_at).getTime() <
      OTP_RESEND_COOLDOWN_MS
  ) {
    return { error: "Please wait a minute before requesting another code." };
  }

  const code = generateOtpCode();
  const { error: upsertError } = await service.from("phone_otps").upsert({
    phone_norm: phoneNorm,
    code_hash: hashOtpCode(phoneNorm, code),
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
    attempts: 0,
    last_sent_at: new Date().toISOString(),
  });
  if (upsertError) {
    console.error("[register] OTP store failed", upsertError);
    return { error: "Could not start verification. Please try again." };
  }

  const sms = await sendSms(
    parsed.data.mobile,
    `Your Napoli 7 verification code is ${code}. It expires in 10 minutes.`,
  );
  if (!sms.sent && HAS_TWILIO) {
    return { error: "We couldn't text that number. Check it and try again." };
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

  const phoneNorm = normalizePhone(parsed.data.mobile);
  const service = createServiceRoleClient();

  const { data: otp } = await service
    .from("phone_otps")
    .select("code_hash, expires_at, attempts")
    .eq("phone_norm", phoneNorm)
    .maybeSingle();

  if (!otp) {
    return { error: "Request a verification code first." };
  }
  if (new Date(otp.expires_at).getTime() < Date.now()) {
    await service.from("phone_otps").delete().eq("phone_norm", phoneNorm);
    return { error: "That code expired. Request a new one." };
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await service.from("phone_otps").delete().eq("phone_norm", phoneNorm);
    return { error: "Too many wrong attempts. Request a new code." };
  }
  if (!verifyOtpHash(phoneNorm, (code ?? "").trim(), otp.code_hash)) {
    await service
      .from("phone_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("phone_norm", phoneNorm);
    return { error: "That code didn't match. Check it and try again." };
  }

  // Valid — burn the code so it can't be replayed.
  await service.from("phone_otps").delete().eq("phone_norm", phoneNorm);

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
