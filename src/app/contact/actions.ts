"use server";

import { z } from "zod";
import { notifyContactMessageEmail } from "@/lib/notifications/email";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";
import type { ContactFormState } from "./state";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .regex(/^[+0-9 ()\-]+$/, "Invalid phone number."),
  email: z.string().trim().email(),
  message: z.string().trim().min(1).max(500),
});

export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "phone" ||
        key === "email" ||
        key === "message"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      status: "error",
      error: "Check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  // Notify by email (best-effort) and record whether it actually went out, so a
  // misconfigured mailer (no key / unverified domain) never silently swallows a
  // customer's message.
  const emailResult = await notifyContactMessageEmail(parsed.data);

  // The database row is the durable source of truth: even if email is down the
  // message is captured and visible in the admin Messages log. Persisting is
  // what makes the form genuinely "work" regardless of the mailer.
  let stored = false;
  if (HAS_SUPABASE) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.from("contact_messages").insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        message: parsed.data.message,
        email_sent: emailResult.sent,
        email_error: emailResult.sent ? null : (emailResult.reason ?? null),
      });
      if (error) {
        console.error("[submitContactMessage] DB insert failed:", error);
      } else {
        stored = true;
      }
    } catch (error) {
      console.error("[submitContactMessage] DB insert threw:", error);
    }
  }

  // Only a genuine dead-end — neither stored nor emailed — is an error the
  // customer needs to act on.
  if (!stored && !emailResult.sent) {
    return {
      status: "error",
      error: "Could not send your message. Please call +971 6 534 5772.",
    };
  }

  return { status: "ok" };
}
