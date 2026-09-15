import { isInsideAjmanMainland } from "./ajman-boundary";

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

// Shop location (Al Jurf 2, Ajman). Keep in sync with the map centre in
// DeliveryMapPicker.
export const SHOP_LOCATION = { lat: 25.4002327, lng: 55.5033167 } as const;

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

/**
 * Straight-line distance (km) from the shop to a dropped pin. Informational
 * only — it is shown to the customer and useful to the driver, but it no longer
 * gates anything.
 */
export function distanceFromShopKm(lat: number, lng: number): number {
  return haversineKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng, lat, lng);
}

export type DeliverabilityResult =
  | { deliverable: true; distanceKm: number }
  // No pin dropped yet, so there is no distance to report.
  | { deliverable: false; reason: "no-pin"; distanceKm: null }
  | { deliverable: false; reason: "outside-ajman"; distanceKm: number };

/**
 * The single authority on whether a dropped pin can be delivered to.
 *
 * One condition: the pin falls inside the mainland Ajman border. The courier
 * partner covers the whole emirate, so the old 7 km circle around the shop is
 * gone — distance no longer decides anything, only which side of the border you
 * are on. Sharjah stays excluded however close it is, which is the whole reason
 * the boundary and not a circle is the test.
 *
 * The area dropdown plays no part here: it is a convenience for the driver, and
 * a customer can pair any area with any street, so the pin is the only thing
 * that decides. Client and server both call this so they cannot drift apart.
 */
export function checkDeliverability(
  lat: number | null | undefined,
  lng: number | null | undefined,
): DeliverabilityResult {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { deliverable: false, reason: "no-pin", distanceKm: null };
  }
  const distanceKm = distanceFromShopKm(lat, lng);
  if (!isInsideAjmanMainland(lat, lng)) {
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
    case "outside-ajman":
      return "That pin is outside Ajman. We deliver anywhere inside Ajman — but Sharjah and the other emirates aren't covered, even when they're nearby. Move the pin inside the Ajman border shown on the map, or switch to pickup.";
  }
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}

/**
 * Above this radius a browser location fix is a guess, not a building. The
 * Geolocation API reports `coords.accuracy` in metres, and it varies by three
 * orders of magnitude depending on what produced the fix: a real GPS lock is
 * 5–20 m, a WiFi trilateration 30–150 m, a cell-tower or IP estimate anything
 * from hundreds of metres to several kilometres. Presenting the last kind as a
 * rooftop pin is how a delivery ends up in the wrong neighbourhood.
 */
export const PRECISE_FIX_ACCURACY_M = 150;

/**
 * The zoom at which a location fix should be shown: close enough to place a
 * building when the fix earns it, wide enough to make an uncertain one obviously
 * uncertain. Zooming to 17 regardless is what makes a 3 km estimate look like a
 * doorstep — the customer accepts a confident-looking pin and never drags it.
 */
export function zoomForAccuracyM(accuracyM: number | null | undefined): number {
  if (accuracyM == null || !Number.isFinite(accuracyM) || accuracyM <= 0) {
    return 16;
  }
  if (accuracyM <= 50) return 17;
  if (accuracyM <= PRECISE_FIX_ACCURACY_M) return 16;
  if (accuracyM <= 500) return 15;
  if (accuracyM <= 1500) return 14;
  return 13;
}

/** Strip case, punctuation and spacing so "Al-Jurf 1" and "al jurf 1" compare equal. */
function normalizeAreaName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * Whether the neighbourhood a pin reverse-geocoded to is plausibly the delivery
 * area the customer selected. Deliberately generous — it only has to catch a pin
 * that is in a genuinely different part of town, so "Al Jurf" vs "Al Jurf 2"
 * agrees while "Muntazy" vs "Al Rashidiya" does not.
 *
 * Existence of a mismatch is advisory, never a block: the pin decides
 * deliverability (see {@link checkDeliverability}) and Nominatim names some
 * neighbourhoods in ways no dropdown will ever contain.
 */
export function pinAreaAgreesWith(
  chosenArea: string | null | undefined,
  pinArea: string | null | undefined,
): boolean {
  const chosen = normalizeAreaName(chosenArea ?? "");
  const pin = normalizeAreaName(pinArea ?? "");
  // Nothing to disagree with.
  if (!chosen || !pin) return true;
  return chosen === pin || chosen.includes(pin) || pin.includes(chosen);
}
