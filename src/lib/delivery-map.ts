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

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
