import { isInsideAjman } from "./ajman-boundary";

export interface DeliveryMapAddress {
  street?: string | null;
  area?: string | null;
  flat?: string | null;
}

export function buildDeliveryMapQuery(address: DeliveryMapAddress | null | undefined): string {
  const street = address?.street?.trim();
  if (!street) return "";

  const area = address?.area?.trim();
  const flat = address?.flat?.trim();
  const parts = [street, flat ? `Flat ${flat}` : "", area, "Ajman, UAE"].filter(
    (part): part is string => Boolean(part && part.trim()),
  );

  return parts.join(", ");
}

export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** A maps link the driver can tap to navigate straight to the dropped pin. */
export function buildGpsMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// Shop location (Al Jurf 2, Ajman) — the centre of the delivery radius. Keep in
// sync with the map centre in DeliveryMapPicker.
export const SHOP_LOCATION = { lat: 25.4002327, lng: 55.5033167 } as const;

// Delivery is available only within this straight-line ("as the crow flies")
// radius of the shop — the courier partner's hard limit. Change this one number
// to widen/narrow the delivery range.
export const DELIVERY_RADIUS_KM = 8;

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Great-circle ("as the crow flies") distance in km between two lat/lng points,
 * via the haversine formula. Straight-line, NOT driving distance.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Straight-line distance (km) from the shop to a dropped pin. */
export function distanceFromShopKm(lat: number, lng: number): number {
  return haversineKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng, lat, lng);
}

/** Whether a pin is within the delivery radius (≤ DELIVERY_RADIUS_KM of the shop). */
export function isWithinDeliveryRadius(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return distanceFromShopKm(lat, lng) <= DELIVERY_RADIUS_KM;
}

export type DeliverabilityResult =
  | { deliverable: true; distanceKm: number }
  // No pin dropped yet, so there is no distance to report.
  | { deliverable: false; reason: "no-pin"; distanceKm: null }
  | { deliverable: false; reason: "outside-radius"; distanceKm: number }
  | { deliverable: false; reason: "outside-ajman"; distanceKm: number };

/**
 * The single authority on whether a dropped pin can be delivered to.
 *
 * A pin qualifies only if it satisfies BOTH conditions:
 *   1. within DELIVERY_RADIUS_KM straight-line of the shop, AND
 *   2. inside the Ajman emirate.
 *
 * The radius alone is not sufficient — about a third of the 8 km circle lies in
 * Sharjah or in the sea, and Sharjah is excluded no matter how close it is. The
 * area dropdown plays no part here: it is a convenience for the driver, and a
 * customer can pair any area with any street, so the pin is the only thing that
 * decides. Client and server both call this so they cannot drift apart.
 */
export function checkDeliverability(
  lat: number | null | undefined,
  lng: number | null | undefined,
): DeliverabilityResult {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { deliverable: false, reason: "no-pin", distanceKm: null };
  }
  const distanceKm = distanceFromShopKm(lat, lng);
  if (distanceKm > DELIVERY_RADIUS_KM) {
    return { deliverable: false, reason: "outside-radius", distanceKm };
  }
  if (!isInsideAjman(lat, lng)) {
    return { deliverable: false, reason: "outside-ajman", distanceKm };
  }
  return { deliverable: true, distanceKm };
}

export type DeliverabilityFailure = Extract<
  DeliverabilityResult,
  { deliverable: false }
>;

/** The customer-facing explanation for a rejected pin. Shared by client and server. */
export function deliverabilityMessage(result: DeliverabilityFailure): string {
  switch (result.reason) {
    case "no-pin":
      return "Drop a pin on the map so the driver can find your exact location.";
    case "outside-radius":
      return `That location is ${result.distanceKm.toFixed(1)} km from the shop — outside our ${DELIVERY_RADIUS_KM} km delivery range. Move the pin closer, or switch to pickup.`;
    case "outside-ajman":
      return "That pin is outside Ajman. We deliver within Ajman only — Sharjah and other emirates aren't covered, even when they're nearby. Move the pin into Ajman, or switch to pickup.";
  }
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
