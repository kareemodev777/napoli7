import twilio from "twilio";
import { HAS_TWILIO } from "@/lib/env";

export interface VerifyStartResult {
  sent: boolean;
  reason?: string;
}

export interface VerifyCheckResult {
  approved: boolean;
  reason?: string;
}

function verifyService() {
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!,
  );
  return client.verify.v2.services(process.env.TWILIO_VERIFY_SERVICE_SID!);
}

/**
 * Start an SMS phone verification via Twilio Verify. Verify owns the code, its
 * TTL, and resend rate-limiting, and routes through Twilio's pre-approved
 * senders — which is what actually reaches UAE numbers (a raw From number can't).
 * `locale: "en"` forces an English message regardless of the destination country.
 * When Twilio isn't configured it no-ops (dev), so the flow stays testable.
 */
export async function startPhoneVerification(
  to: string,
): Promise<VerifyStartResult> {
  if (!HAS_TWILIO) {
    console.info(`[verify] Twilio Verify disabled. Would send a code to ${to}.`);
    return { sent: false, reason: "SMS not configured" };
  }
  try {
    await verifyService().verifications.create({
      to,
      channel: "sms",
      locale: "en",
    });
    return { sent: true };
  } catch (e) {
    console.error("[verify] start failed:", e);
    return {
      sent: false,
      reason: e instanceof Error ? e.message : "Could not send the code.",
    };
  }
}

/**
 * Check a code against Twilio Verify. Returns approved only on an exact,
 * unexpired, not-yet-consumed match. Twilio throws (404) when the verification
 * has expired or was already used, which we surface as a friendly retry.
 */
export async function checkPhoneVerification(
  to: string,
  code: string,
): Promise<VerifyCheckResult> {
  if (!HAS_TWILIO) return { approved: false, reason: "SMS not configured" };
  try {
    const check = await verifyService().verificationChecks.create({
      to,
      code: (code ?? "").trim(),
    });
    if (check.status === "approved") return { approved: true };
    return { approved: false, reason: "That code didn't match. Try again." };
  } catch (e) {
    console.error("[verify] check failed:", e);
    return {
      approved: false,
      reason: "That code didn't match or expired. Request a new one.",
    };
  }
}
