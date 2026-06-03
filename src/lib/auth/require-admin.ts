import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";
import { isAdminUser } from "@/lib/auth/roles";

export async function requireAdmin() {
  if (!HAS_SUPABASE) redirect("/login");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await isAdminUser(user))) redirect("/");
  return user;
}
