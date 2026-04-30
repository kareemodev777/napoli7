import { createClient as createServiceClient } from "@supabase/supabase-js";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";

export function createServiceRoleClient() {
  if (!HAS_SUPABASE_SERVICE) {
    throw new Error(
      "Supabase service role env vars not set. SUPABASE_SERVICE_ROLE_KEY required for webhooks and admin actions."
    );
  }
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
