export const SITE_URL =
  process.env["NEXT_PUBLIC_SITE_URL"] ?? "https://napoli7.com";

export const HAS_SUPABASE = Boolean(
  process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
);

export const HAS_SUPABASE_SERVICE = Boolean(
  process.env["NEXT_PUBLIC_SUPABASE_URL"] &&
    process.env["SUPABASE_SERVICE_ROLE_KEY"],
);

export const HAS_RESEND = Boolean(process.env["RESEND_API_KEY"]);

export const HAS_STRIPE = Boolean(
  process.env["STRIPE_SECRET_KEY"] &&
    process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"],
);

export const HAS_WHATSAPP = Boolean(
  process.env["WHATSAPP_ACCESS_TOKEN"] &&
    process.env["WHATSAPP_PHONE_NUMBER_ID"],
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
