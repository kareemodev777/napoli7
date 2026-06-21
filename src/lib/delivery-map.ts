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

// Approximate bounding box covering Ajman's delivery footprint. It is generous
// enough to include the outer zones (Al Mowaihat, Al Yasmeen) while excluding
// neighbouring Sharjah, so a pin dropped on a Sharjah address is rejected even
// when the customer picked a valid Ajman area in the dropdown.
export const AJMAN_DELIVERY_BOUNDS = {
  latMin: 25.36,
  latMax: 25.48,
  lngMin: 55.42,
  lngMax: 55.6,
} as const;

export function isWithinAjmanDeliveryArea(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return (
    lat >= AJMAN_DELIVERY_BOUNDS.latMin &&
    lat <= AJMAN_DELIVERY_BOUNDS.latMax &&
    lng >= AJMAN_DELIVERY_BOUNDS.lngMin &&
    lng <= AJMAN_DELIVERY_BOUNDS.lngMax
  );
}

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
