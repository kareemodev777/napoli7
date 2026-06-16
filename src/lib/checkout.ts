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
export const DEFAULT_DELIVERY_FEE = 20;

/**
 * Minimum order subtotal (AED, before delivery fee) required for a delivery
 * order. Pickup orders have no minimum. Enforced on both the checkout form and
 * the server action so it can't be bypassed.
 */
export const DELIVERY_MIN_SUBTOTAL_AED = 28;

// Mirrors the seed in 008. Used when Supabase service env vars are absent
// (graceful fallback, matching the catalog mock pattern).
const MOCK_ZONES: DeliveryZone[] = [
  { area: "Al Jurf 1", fee: 10 },
  { area: "Al Jurf 2", fee: 10 },
  { area: "Al Nuaimiya", fee: 12 },
  { area: "Al Rashidiya", fee: 12 },
  { area: "Al Rumailah", fee: 15 },
  { area: "Ajman Corniche", fee: 15 },
  { area: "Al Zahra", fee: 15 },
  { area: "Al Mowaihat", fee: 18 },
  { area: "Al Hamidiya", fee: 18 },
  { area: "Al Yasmeen", fee: 20 },
];

function normalizeArea(area: string): string {
  return area.trim().toLowerCase();
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
