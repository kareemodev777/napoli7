// Outbound SMS via the Twilio Messages API.
//
// This did not exist. Twilio was wired up for Verify only — the six-digit login
// OTP — and Verify cannot send an arbitrary message. So every "SMS notification"
// in the product was a thing nobody had written: no configuration would have
// produced one, and nothing anywhere said so.
//
// Best-effort, like the other channels: never throws, returns a reason instead, so
// a failed notification can never block an order.

import { HAS_SMS, SMS_FROM, SMS_MESSAGING_SERVICE_SID } from "@/lib/env";

export interface SmsResult {
  sent: boolean;
  reason?: string;
}

/**
 * E.164 for the UAE, WITH the leading + (Twilio requires it — unlike WhatsApp,
 * which wants bare digits).
 */
export function toSmsNumber(phone: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  // Local 0-prefixed UAE mobile (05x…) -> +9715x…
  if (digits.startsWith("0")) return `+971${digits.slice(1)}`;
  // Bare 9-digit national number (5x…) -> +9715x…
  if (digits.startsWith("5") && digits.length === 9) return `+971${digits}`;
  return `+${digits}`;
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const recipient = toSmsNumber(to);

  if (!HAS_SMS) {
    console.warn(
      `[sms] NOT SENT — SMS is not configured (needs TWILIO_ACCOUNT_SID, ` +
        `TWILIO_AUTH_TOKEN and TWILIO_MESSAGING_SERVICE_SID). Would have sent to ${recipient}.`,
    );
    return { sent: false, reason: "SMS is not configured" };
  }
  if (!recipient) {
    return { sent: false, reason: "No phone number" };
  }

  const accountSid = process.env["TWILIO_ACCOUNT_SID"]!;
  const authToken = process.env["TWILIO_AUTH_TOKEN"]!;

  const form = new URLSearchParams({ To: recipient, Body: body });
  // A Messaging Service carries the registered sender ID the UAE requires; a bare
  // From number is the dev/testing fallback.
  if (SMS_MESSAGING_SERVICE_SID) {
    form.set("MessagingServiceSid", SMS_MESSAGING_SERVICE_SID);
  } else {
    form.set("From", SMS_FROM);
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        },
        body: form,
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[sms] Twilio rejected the message:", res.status, detail);
      return { sent: false, reason: `Twilio rejected the message (${res.status})` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[sms] send failed:", e);
    return { sent: false, reason: "Could not reach Twilio" };
  }
}
