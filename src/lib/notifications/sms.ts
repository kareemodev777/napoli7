import twilio from "twilio";
import { HAS_TWILIO } from "@/lib/env";

/** Outcome of a best-effort SMS send, so callers can react to a failure. */
export interface SmsSendResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send an SMS through Twilio. Prefers a Messaging Service SID (better for UAE
 * deliverability and sender management); falls back to a single From number.
 * When Twilio isn't configured it logs the message in dev instead of throwing,
 * so the registration flow stays testable locally.
 */
export async function sendSms(
  to: string,
  body: string,
): Promise<SmsSendResult> {
  if (!HAS_TWILIO) {
    console.info(`[sms] Twilio disabled. Would send to ${to}: ${body}`);
    return { sent: false, reason: "SMS not configured" };
  }
  try {
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    const sender = process.env.TWILIO_MESSAGING_SERVICE_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID }
      : { from: process.env.TWILIO_FROM_NUMBER! };
    await client.messages.create({ to, body, ...sender });
    return { sent: true };
  } catch (e) {
    console.error("[sms] Twilio send failed:", e);
    return {
      sent: false,
      reason: e instanceof Error ? e.message : "SMS send failed",
    };
  }
}
