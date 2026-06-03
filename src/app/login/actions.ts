"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE, SITE_URL } from "@/lib/env";
import { getUserRole, isAdminPath } from "@/lib/auth/roles";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional(),
});

const magicSchema = z.object({
  email: z.string().email(),
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
      redirectTo: `${SITE_URL}/login`,
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
