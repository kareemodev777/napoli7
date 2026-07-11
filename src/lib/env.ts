// Trailing slashes are stripped so string-concatenated paths (e.g. Stripe's
// success_url, `${SITE_URL}/order/...`) can never produce a double slash like
// `napoli7.com//order/...`, which doesn't match the route and fails to load.
export const SITE_URL = (
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://napoli7.com"
).replace(/\/+$/, "");

export const HAS_SUPABASE = Boolean(
  process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
);

export const HAS_SUPABASE_SERVICE = Boolean(
  process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["SUPABASE_SERVICE_ROLE_KEY"],
);

export const HAS_RESEND = Boolean(process.env["RESEND_API_KEY"]);

// Twilio Verify (registration phone-OTP verification). Uses Twilio's Verify
// service, which routes through pre-approved senders — the only thing that
// actually delivers OTPs to UAE numbers. Needs the account SID + auth token +
// the Verify Service SID (VA…). Omit any to fall back to no-OTP in dev.
export const HAS_TWILIO = Boolean(
  process.env["TWILIO_ACCOUNT_SID"] &&
    process.env["TWILIO_AUTH_TOKEN"] &&
    process.env["TWILIO_VERIFY_SERVICE_SID"],
);

// Whether registration requires an SMS one-time-code. It only turns on when
// Twilio is actually configured, so a missing config can never strand a user on
// a code they'll never receive — registration falls back to a direct sign-up.
// Set REGISTRATION_OTP_ENABLED=false to force it off even with Twilio present.
export const REGISTRATION_OTP_ENABLED =
  process.env["REGISTRATION_OTP_ENABLED"] === "false" ? false : HAS_TWILIO;

export const HAS_STRIPE = Boolean(
  process.env["STRIPE_SECRET_KEY"] &&
    process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
);

export const HAS_WHATSAPP = Boolean(
  process.env["WHATSAPP_ACCESS_TOKEN"] &&
    process.env["WHATSAPP_PHONE_NUMBER_ID"],
);

/**
 * Outbound SMS (order updates to the customer, assignments to the rider). This is
 * NOT the same thing as HAS_TWILIO above: that gates Twilio *Verify*, which only
 * sends login OTPs and cannot send an arbitrary message. Sending one needs the
 * Messages API and a sender to send FROM, which Verify does not provide — so a
 * fully-working Verify setup still sends no notifications at all.
 *
 * Prefer TWILIO_MESSAGING_SERVICE_SID (MG…): the UAE requires a registered sender
 * ID, and a Messaging Service is what holds it. TWILIO_SMS_FROM (a plain +971…
 * number) is the fallback for testing.
 */
export const SMS_MESSAGING_SERVICE_SID =
  process.env["TWILIO_MESSAGING_SERVICE_SID"] ?? "";
export const SMS_FROM = process.env["TWILIO_SMS_FROM"] ?? "";

export const HAS_SMS = Boolean(
  process.env["TWILIO_ACCOUNT_SID"] &&
    process.env["TWILIO_AUTH_TOKEN"] &&
    (SMS_MESSAGING_SERVICE_SID || SMS_FROM),
);

export const ORDER_EMAIL_TO = process.env["ORDER_EMAIL_TO"] ?? "info@napoli7.com";
export const ORDER_EMAIL_FROM =
  process.env["ORDER_EMAIL_FROM"] ?? "orders@napoli7.com";

// POS integration (xtbooks). Pushes confirmed website orders into the POS over
// HTTP. Inert until BOTH a webhook URL is set AND POS_PUSH_ENABLED === "true",
// mirroring the HAS_STRIPE / HAS_WHATSAPP gating so it stays off in dev/preview.
export const HAS_POS = Boolean(
  process.env["POS_WEBHOOK_URL"] && process.env["POS_PUSH_ENABLED"] === "true",
);
export const POS_WEBHOOK_URL = process.env["POS_WEBHOOK_URL"] ?? "";
export const POS_PRODUCT_WEBHOOK_URL =
  process.env["POS_PRODUCT_WEBHOOK_URL"] ?? "";
// Read-only POS catalog endpoint (product list + SKUs) used to verify our SKU
// map. Falls back to deriving it from the order webhook URL
// (.../woocommerce/webhook -> .../woocommerce/products) when not set explicitly.
export const POS_PRODUCTS_URL =
  process.env["POS_PRODUCTS_URL"] ??
  (POS_WEBHOOK_URL ? POS_WEBHOOK_URL.replace(/\/webhook\/?$/, "/products") : "");
