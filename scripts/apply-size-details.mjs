// One-off: set pizza size detail to "30 cm" (medium) / "24 cm" (small) in the
// live catalog, matching migration 013. Targets only rows whose detail still
// reads "Medium pizza" / "Small pizza" (case-insensitive). Safe to re-run.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing Supabase env. Run with: node --env-file=.env.local");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const med = await sb
  .from("product_sizes")
  .update({ detail: "30 cm" })
  .ilike("detail", "medium pizza")
  .select("id");

const sml = await sb
  .from("product_sizes")
  .update({ detail: "24 cm" })
  .ilike("detail", "small pizza")
  .select("id");

if (med.error) console.error("medium update error:", med.error.message);
if (sml.error) console.error("small update error:", sml.error.message);
console.log(`medium → 30 cm: ${med.data?.length ?? 0} rows updated`);
console.log(`small  → 24 cm: ${sml.data?.length ?? 0} rows updated`);
