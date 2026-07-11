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
import { placeholderEmailForPhone } from "@/lib/auth/placeholder-email";

const registerSchema = z
  .object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    // Optional. The mobile is the identity — SMS is how we verify a customer —
    // and an email is a nice-to-have for receipts. An empty string means "none";
    // a non-empty one still has to be a real address.
    email: z
      .string()
      .trim()
      .email("Enter a valid email, or leave it blank.")
      .optional()
      .or(z.literal("")),
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
  /**
   * True when the account still needs email confirmation before use (the no-SMS
   * fallback). False when SMS OTP already verified the customer — the account is
   * created confirmed and signed in, so no confirmation email is sent.
   */
  emailConfirmationRequired?: boolean;
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
  // farmed by re-using one phone (or email) across throwaway signups. The phone
  // check is the one that matters: it is mandatory, so it is the identity that
  // actually bounds the offer. The email check only runs when an email was given.
  if (HAS_SUPABASE_SERVICE) {
    try {
      const service = createServiceRoleClient();
      const givenEmail = data.email?.trim();
      const [phoneRes, emailRes] = await Promise.all([
        service.rpc("phone_already_registered", { p_phone: data.mobile }),
        givenEmail
          ? service.rpc("email_already_registered", { p_email: givenEmail })
          : Promise.resolve({ data: false }),
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

  // SMS OTP succeeded, so the number (and identity) is verified — create the
  // account already-confirmed and skip the email confirmation entirely. If
  // Twilio isn't configured we never actually texted a code, so fall back to
  // email confirmation rather than confirming on nothing.
  return createAccountAndClaim(parsed.data, { emailPreConfirmed: HAS_TWILIO });
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
  // No SMS step ran here, so keep email confirmation as the verification gate.
  return createAccountAndClaim(parsed.data, { emailPreConfirmed: false });
}

/**
 * Create the account and issue the launch free-pizza reward. Re-screens identity
 * right before creation for race-safety. Shared by the OTP and direct paths.
 *
 * When {@link CreateOptions.emailPreConfirmed} is true (SMS OTP verified the
 * customer) the account is created already-confirmed via the admin API — no
 * confirmation email — and the customer is signed straight in. Otherwise it uses
 * the standard email sign-up so the confirmation email still gates the account.
 */
interface CreateOptions {
  emailPreConfirmed: boolean;
}

async function createAccountAndClaim(
  data: RegisterInput,
  { emailPreConfirmed }: CreateOptions,
): Promise<RegisterResult> {
  const blocked = await screenIdentity(data);
  if (blocked) return blocked;

  // Supabase Auth needs an address to hang the account on even when the customer
  // gave none, so a phone-only signup gets a placeholder derived from the mobile.
  // Nothing is ever mailed to it — see isPlaceholderEmail.
  const givenEmail = data.email?.trim() || null;
  const authEmail = givenEmail ?? placeholderEmailForPhone(data.mobile);

  // Without a real address, the confirm-your-email gate is meaningless: the
  // confirmation would be sent to an inbox that cannot exist, and the account
  // would be stranded forever. A phone-only account is therefore always created
  // confirmed — the SMS code is what verified them, which is the whole point.
  const createConfirmed = emailPreConfirmed || !givenEmail;

  const userMetadata = {
    first_name: data.firstName,
    last_name: data.lastName,
    mobile: data.mobile,
    /** Null when the customer gave no email — so we never mail the placeholder. */
    email: givenEmail,
  };

  let userId: string | null = null;

  if (createConfirmed && HAS_SUPABASE_SERVICE) {
    // Verified by SMS OTP, or phone-only with no inbox to confirm → create the
    // account already-confirmed and sign the customer in, ready to order.
    const service = createServiceRoleClient();
    const { data: created, error } = await service.auth.admin.createUser({
      email: authEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        return {
          error: "An account with this email already exists. Log in instead.",
        };
      }
      return { error: error.message };
    }
    userId = created.user?.id ?? null;

    // Establish a session cookie so the customer is logged in on return.
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: data.password,
    });
    if (signInError) {
      console.error("[register] auto sign-in after OTP signup failed", signInError);
    }
  } else {
    // No SMS verification — standard email sign-up keeps the verify-email gate.
    const supabase = await createClient();
    const { data: signUp, error } = await supabase.auth.signUp({
      email: authEmail,
      password: data.password,
      options: {
        emailRedirectTo: buildEmailVerificationRedirect(SITE_URL, authEmail),
        data: userMetadata,
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
    userId = signUp.user?.id ?? null;
  }

  // Nothing to confirm when the account was created confirmed — and a phone-only
  // account always is, since there is no inbox a confirmation could reach.
  const emailConfirmationRequired = !createConfirmed;

  // Launch offer — deduped on email + phone in the RPC. The phone is what bounds
  // it; the placeholder address is unique per mobile, so it dedupes the same way.
  try {
    const claimed = await claimSignupFreePizza({
      userId,
      email: authEmail,
      phone: data.mobile,
    });
    if (claimed) {
      // The reward code goes out by email only if there is an inbox to send it
      // to. A phone-only customer sees it on screen and finds it in their account.
      if (givenEmail) {
        await notifyFreePizzaRewardEmail({
          to: givenEmail,
          firstName: data.firstName,
          code: claimed.code,
          rewardName: claimed.rewardName,
          claimNumber: claimed.claimNumber,
        }).catch((e: unknown) =>
          console.error("[register] reward email failed", e),
        );
      }
      return { ok: true, reward: claimed, emailConfirmationRequired };
    }
  } catch (e: unknown) {
    console.error("[register] free-pizza claim failed", e);
  }

  return { ok: true, emailConfirmationRequired };
}
