"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { notifyContactMessageEmail } from "@/lib/notifications/email";

export interface ResendResult {
  error?: string;
  sent?: boolean;
}

/**
 * Re-send the email notification for a stored contact message (admin-only) and
 * update its delivered/error state. Used to recover messages whose original
 * send failed — e.g. once a bad Resend key or unverified domain is fixed.
 */
export async function resendContactEmail(
  messageId: string,
): Promise<ResendResult> {
  await requireAdmin();
  if (!HAS_SUPABASE_SERVICE) {
    return { error: "Supabase service-role key required." };
  }

  const supabase = createServiceRoleClient();
  const { data: msg } = await supabase
    .from("contact_messages")
    .select("name, phone, email, message")
    .eq("id", messageId)
    .maybeSingle();
  if (!msg) return { error: "Message not found." };

  const result = await notifyContactMessageEmail({
    name: msg.name,
    phone: msg.phone,
    email: msg.email,
    message: msg.message,
  });

  await supabase
    .from("contact_messages")
    .update({
      email_sent: result.sent,
      email_error: result.sent ? null : (result.reason ?? null),
    })
    .eq("id", messageId);

  revalidatePath("/admin/messages");
  return result.sent
    ? { sent: true }
    : { sent: false, error: result.reason ?? "Send failed." };
}
