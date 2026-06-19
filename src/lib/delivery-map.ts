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

export function buildGoogleMapsEmbedUrl(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=17&output=embed`;
}
