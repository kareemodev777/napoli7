// Getting a message onto someone's phone, by whichever channel is actually live.
//
// Two channels exist and each fails in its own quiet way. WhatsApp is free but
// needs a Meta app, and when it is unconfigured it returns "not configured" and
// nothing happens. SMS costs money but works with a Twilio sender. Neither was
// reaching a rider: WhatsApp had no credentials, and SMS had no code at all.
//
// So: try WhatsApp, fall back to SMS, and REPORT which one worked. The reporting
// is the point. Both channels were already best-effort — a failure never throws —
// which is right for not blocking an order, but it also meant a rider could be
// assigned, told nothing, and the admin screen would look exactly the same as if
// they had been told.

import type { CustomerNotificationInput } from "./email";
import {
  customerStatusMessage,
  notifyCustomerStatusWhatsApp,
  riderAssignmentMessage,
  type RiderAssignmentInput,
} from "./whatsapp";
import { sendSms } from "./sms";

export type NotifyChannel = "whatsapp" | "sms";

export interface PhoneNotifyResult {
  sent: boolean;
  /** Which channel delivered it. Absent when nothing did. */
  channel?: NotifyChannel;
  /** Why nothing was delivered — shown to the admin, not swallowed. */
  reason?: string;
}

/**
 * WhatsApp first (free), SMS second (paid, but reliable). One message per event:
 * a customer who gets the WhatsApp does not also get billed an SMS.
 */
async function whatsappThenSms(
  whatsapp: () => Promise<{ sent: boolean; reason?: string }>,
  phone: string,
  smsBody: string,
): Promise<PhoneNotifyResult> {
  let whatsappReason: string | undefined;
  try {
    const result = await whatsapp();
    if (result.sent) return { sent: true, channel: "whatsapp" };
    whatsappReason = result.reason;
  } catch (e) {
    console.error("[notify] whatsapp threw:", e);
    whatsappReason = "WhatsApp threw";
  }

  const sms = await sendSms(phone, smsBody);
  if (sms.sent) return { sent: true, channel: "sms" };

  return {
    sent: false,
    reason: `WhatsApp: ${whatsappReason ?? "failed"}. SMS: ${sms.reason ?? "failed"}.`,
  };
}

/** Tell the customer their order moved on — by WhatsApp, else by SMS. */
export async function notifyCustomerStatusPhone(
  input: Omit<CustomerNotificationInput, "to"> & { customerPhone: string },
): Promise<PhoneNotifyResult> {
  return whatsappThenSms(
    () => notifyCustomerStatusWhatsApp(input),
    input.customerPhone,
    customerStatusMessage(input),
  );
}

/**
 * Tell the rider they have a delivery — over SMS only.
 *
 * The drivers aren't on WhatsApp, and Twilio SMS is set up and reliable, so the
 * rider channel is deliberately SMS and does not attempt WhatsApp first. (Customer
 * status updates still go WhatsApp-then-SMS above.) To put riders back on WhatsApp,
 * wrap this in whatsappThenSms with notifyRiderAssignmentWhatsApp as before.
 */
export async function notifyRiderAssignmentPhone(
  input: RiderAssignmentInput,
): Promise<PhoneNotifyResult> {
  const sms = await sendSms(input.riderPhone, riderAssignmentMessage(input));
  if (sms.sent) return { sent: true, channel: "sms" };
  return { sent: false, reason: `SMS: ${sms.reason ?? "failed"}.` };
}
