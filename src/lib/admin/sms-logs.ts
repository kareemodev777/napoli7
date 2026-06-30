import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface SmsLogRow {
  id: string;
  phone: string;
  kind: string;
  ok: boolean;
  detail: string | null;
  createdAt: string;
}

/** Recent OTP (Twilio Verify) sends/checks, newest first. */
export async function loadSmsLogs(limit = 5): Promise<SmsLogRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("sms_logs")
    .select("id, phone, kind, ok, detail, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    phone: r.phone,
    kind: r.kind,
    ok: r.ok,
    detail: r.detail,
    createdAt: r.created_at,
  }));
}

/** Mask the middle digits of a phone for the log (admin-only, light privacy). */
export function maskPhone(phone: string): string {
  if (phone.length <= 8) return phone;
  return `${phone.slice(0, 6)}${"•".repeat(phone.length - 8)}${phone.slice(-2)}`;
}
