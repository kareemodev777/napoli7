import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";

export type UserRole = "admin" | "kitchen" | "customer";

export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (!HAS_SUPABASE) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.role as UserRole | undefined) ?? null;
}

export async function isAdminUser(user: Pick<User, "id"> | null): Promise<boolean> {
  if (!user) return false;
  return (await getUserRole(user.id)) === "admin";
}

export function isAccountPath(path: string | undefined): boolean {
  return Boolean(path && (path === "/account" || path.startsWith("/account/")));
}

export function isAdminPath(path: string | undefined): boolean {
  return Boolean(path && (path === "/admin" || path.startsWith("/admin/")));
}
