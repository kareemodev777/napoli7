/**
 * Pure types + helpers for the admin-configurable marketing popup — a
 * professional modal that opens on the storefront (immediately or after a delay)
 * with an image, a message, and a call-to-action. No server import here so the
 * client popup component can consume it directly; the DB reader lives in
 * `marketing-popup.server.ts`.
 */

/** What the popup's primary button does. */
export type PopupCtaType = "none" | "link" | "copy" | "redeem";

export const POPUP_CTA_TYPES: readonly PopupCtaType[] = [
  "none",
  "link",
  "copy",
  "redeem",
];

export interface MarketingPopup {
  enabled: boolean;
  imageUrl: string;
  title: string;
  body: string;
  ctaType: PopupCtaType;
  ctaLabel: string;
  /** Destination for a "link" CTA. */
  ctaHref: string;
  /** Promo code for a "copy" or "redeem" CTA. */
  ctaCode: string;
  /** Seconds after page load before the popup opens. 0 = immediately. */
  delaySeconds: number;
}

/** Off by default — a missing table/row or a failed read never pops anything up. */
export const MARKETING_POPUP_OFF: MarketingPopup = {
  enabled: false,
  imageUrl: "",
  title: "",
  body: "",
  ctaType: "none",
  ctaLabel: "",
  ctaHref: "",
  ctaCode: "",
  delaySeconds: 0,
};

export function isPopupCtaType(value: string): value is PopupCtaType {
  return (POPUP_CTA_TYPES as readonly string[]).includes(value);
}

/** Clamp the open-delay to a sane 0–60s whole number of seconds. */
export function normalizePopupDelaySeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(60, Math.max(0, Math.round(value)));
}

/**
 * A short, stable signature of what the popup shows. The storefront stores it in
 * sessionStorage so the popup appears once per browser session — but re-appears
 * the moment the admin changes its content (the signature changes with it),
 * rather than staying hidden behind a stale "already seen" flag.
 */
export function popupSignature(popup: MarketingPopup): string {
  const raw = [
    popup.imageUrl,
    popup.title,
    popup.body,
    popup.ctaType,
    popup.ctaLabel,
    popup.ctaHref,
    popup.ctaCode,
  ].join("|");
  // Tiny non-cryptographic hash (djb2) — collisions are harmless here (worst case
  // a returning visitor doesn't see a changed popup until next session).
  let hash = 5381;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 33) ^ raw.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
