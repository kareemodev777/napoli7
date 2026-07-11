import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface DeliveryZone {
  area: string;
  fee: number;
}

export interface DeliveryFeeResult {
  /** True only when the area matches an active delivery zone. */
  supported: boolean;
  /** Fee in AED for a supported area; 0 when unsupported. */
  fee: number;
}

/**
 * Placeholder fee used purely for client-side display fallback. It is NEVER
 * charged for an unknown area — unsupported areas are blocked, not billed.
 */
export const DEFAULT_DELIVERY_FEE = 12;

// Mirrors the seed in 027. Used when Supabase service env vars are absent
// (graceful fallback, matching the catalog mock pattern).
//
// Ajman areas only — Sharjah is excluded by policy. The area is a convenience
// field for the driver; whether an order can actually be delivered is decided by
// the GPS pin (see checkDeliverability in ./delivery-map), not by this list. An
// area appearing here does not promise every address in it is reachable: Al Helio
// reaches past the 8 km radius, and pins out there are refused.
const MOCK_ZONES: DeliveryZone[] = [
  { area: "Al Jurf", fee: 9 },
  { area: "Al Nuaimiya", fee: 9 },
  { area: "Al Rashidiya", fee: 9 },
  { area: "Al Rumailah", fee: 9 },
  { area: "Al Nakheel", fee: 9 },
  { area: "Al Bustan", fee: 9 },
  { area: "Ajman Corniche", fee: 9 },
  { area: "Al Zahra", fee: 9 },
  { area: "Al Hamidiya", fee: 9 },
  { area: "Al Rawda", fee: 9 },
  { area: "Al Mowaihat", fee: 9 },
  { area: "Al Tallah", fee: 9 },
  { area: "Al Yasmeen", fee: 9 },
  { area: "Al Helio", fee: 9 },
  { area: "Al Zahya", fee: 9 },
  { area: "Al Alia", fee: 9 },
  { area: "Al Raqaib", fee: 9 },
  { area: "Ajman Industrial Area", fee: 9 },
  { area: "Emirates City", fee: 9 },
  { area: "Al Zorah", fee: 9 },
];

function normalizeArea(area: string): string {
  return area.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Pure zone match (case-insensitive). Returns the matching zone or null. Kept
 * pure so the supported/blocked decision is unit-testable without Supabase.
 */
export function matchDeliveryZone(
  zones: DeliveryZone[],
  area: string,
): DeliveryZone | null {
  if (!area.trim()) return null;
  return zones.find((z) => normalizeArea(z.area) === normalizeArea(area)) ?? null;
}

export function filterDeliveryZones(
  zones: DeliveryZone[],
  query: string,
  limit = 6,
): DeliveryZone[] {
  const needle = normalizeArea(query);
  if (!needle) return [];

  return zones
    .map((zone, index) => ({
      zone,
      index,
      area: normalizeArea(zone.area),
    }))
    .filter(({ area }) => area.includes(needle))
    .sort((a, b) => {
      const aStarts = a.area.startsWith(needle) ? 0 : 1;
      const bStarts = b.area.startsWith(needle) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      const aExact = a.area === needle ? 0 : 1;
      const bExact = b.area === needle ? 0 : 1;
      if (aExact !== bExact) return aExact - bExact;
      return a.index - b.index;
    })
    .slice(0, limit)
    .map(({ zone }) => zone);
}

/** Pure: resolve the fee/supported result for an area against a zone list. */
export function resolveDeliveryFeeFromZones(
  zones: DeliveryZone[],
  area: string,
): DeliveryFeeResult {
  const match = matchDeliveryZone(zones, area);
  return match ? { supported: true, fee: match.fee } : { supported: false, fee: 0 };
}

/** Active delivery zones, ordered for display. Falls back to mock data. */
export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  if (!HAS_SUPABASE_SERVICE) return MOCK_ZONES;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("area, fee_aed")
      .eq("active", true)
      .order("position");

    if (error) {
      console.error("[checkout] delivery zone load failed", error);
      // Supabase is configured, so fail closed: do not silently re-enable mock
      // zones when the owner disabled/deleted live delivery areas.
      return [];
    }
    if (!data || data.length === 0) return [];

    return data.map((row) => ({
      area: row.area as string,
      fee: Number(row.fee_aed),
    }));
  } catch (error) {
    console.error("[checkout] delivery zone load failed", error);
    return [];
  }
}

/**
 * Authoritative delivery fee for an area. Unknown/disabled areas come back as
 * `{ supported: false }` so the caller can BLOCK the order rather than charge a
 * default fee for an area Napoli 7 doesn't deliver to.
 */
export async function resolveDeliveryFee(
  area: string,
): Promise<DeliveryFeeResult> {
  const zones = await getDeliveryZones();
  return resolveDeliveryFeeFromZones(zones, area);
}
