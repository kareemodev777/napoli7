import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export async function requireAuth(redirectTo = "/account") {
  if (!HAS_SUPABASE) {
    redirect("/login?next=" + encodeURIComponent(redirectTo));
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=" + encodeURIComponent(redirectTo));
  }
  return user;
}

export async function getCurrentUser() {
  if (!HAS_SUPABASE) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
