"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE, SITE_URL } from "@/lib/env";
import { getUserRole, isAdminPath } from "@/lib/auth/roles";
import { buildPasswordResetRedirect } from "@/lib/auth/password-reset";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const magicSchema = z.object({
  email: z.string().email(),
});

// E.164: a leading + and 8–15 digits. Twilio (the Supabase SMS provider) expects
// numbers in this format, e.g. +9715XXXXXXXX.
const phoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
});

const verifyPhoneSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  token: z.string().regex(/^\d{4,10}$/),
});

const resetSchema = z.object({
  email: z.string().email(),
});

export interface AuthResult {
  error?: string;
  message?: string;
}

export async function loginWithPassword(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and password." };
  }
  if (!HAS_SUPABASE) {
    return {
      error: "Login activates once Supabase is configured. See README.",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: "Incorrect email or password." };
  }

  const requestedNext = parsed.data.next;
  const role = await getUserRole(data.user.id);
  if (role === "admin") {
    redirect(isAdminPath(requestedNext) ? requestedNext! : "/admin");
  }

  redirect(requestedNext && !isAdminPath(requestedNext) ? requestedNext : "/account");
}

export async function sendMagicLink(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = magicSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };
  if (!HAS_SUPABASE) {
    return { error: "Magic link activates once Supabase is configured." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${SITE_URL}/login?confirmed=true` },
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your inbox for a sign-in link." };
}

/**
 * Step 1 of phone login: send a one-time SMS code. Supabase delivers it through
 * the configured SMS provider (Twilio). Requires the Phone provider to be enabled
 * in the Supabase dashboard with Twilio credentials.
 */
export async function sendPhoneOtp(phone: string): Promise<AuthResult> {
  const parsed = phoneSchema.safeParse({ phone });
  if (!parsed.success) {
    return {
      error: "Enter a valid mobile number with country code, e.g. +9715XXXXXXXX.",
    };
  }
  if (!HAS_SUPABASE) {
    return { error: "SMS login activates once Supabase + Twilio are configured." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: parsed.data.phone,
  });
  if (error) {
    return { error: error.message };
  }
  return { message: "We sent a 6-digit code to your phone by SMS." };
}

/**
 * Step 2 of phone login: verify the SMS code. On success Supabase sets the
 * session cookies (this runs in a Server Action, so the cookie write succeeds).
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
): Promise<AuthResult> {
  const parsed = verifyPhoneSchema.safeParse({ phone, token });
  if (!parsed.success) {
    return { error: "Enter the code we sent by SMS." };
  }
  if (!HAS_SUPABASE) {
    return { error: "SMS login activates once Supabase + Twilio are configured." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.token,
    type: "sms",
  });
  if (error) {
    return {
      error: "That code didn't work. Request a new one and try again.",
    };
  }
  return { message: "ok" };
}

export async function sendPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const parsed = resetSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Enter a valid email." };
  if (!HAS_SUPABASE) {
    return { error: "Password reset activates once Supabase is configured." };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: buildPasswordResetRedirect(SITE_URL),
    },
  );
  if (error) {
    return { error: error.message };
  }
  return { message: "Check your inbox for a reset link." };
}

export async function signOut() {
  if (!HAS_SUPABASE) redirect("/");
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
