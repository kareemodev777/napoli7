"use server";

import { z } from "zod";
import { notifyContactMessageEmail } from "@/lib/notifications/email";

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

export type ContactFormState = {
  status: "idle" | "ok" | "error";
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "message", string>>;
};

export const INITIAL_CONTACT_STATE: ContactFormState = { status: "idle" };

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

  try {
    await notifyContactMessageEmail(parsed.data);
    return { status: "ok" };
  } catch (error) {
    console.error("[submitContactMessage] Resend failure", error);
    return {
      status: "error",
      error: "Could not send your message. Please call +971 6 534 5772.",
    };
  }
}
