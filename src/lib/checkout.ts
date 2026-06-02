import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export interface DeliveryZone {
  area: string;
  fee: number;
}

/** Fee charged when the delivery area isn't in the zone table. */
export const DEFAULT_DELIVERY_FEE = 20;

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
      return MOCK_ZONES;
    }
    if (!data || data.length === 0) return MOCK_ZONES;

    return data.map((row) => ({
      area: row.area as string,
      fee: Number(row.fee_aed),
    }));
  } catch (error) {
    console.error("[checkout] delivery zone load failed", error);
    return MOCK_ZONES;
  }
}

/**
 * Flat delivery fee for an area (case-insensitive match). Unknown or empty
 * areas fall back to DEFAULT_DELIVERY_FEE.
 */
export async function getDeliveryFee(area: string): Promise<number> {
  if (!area.trim()) return DEFAULT_DELIVERY_FEE;
  const zones = await getDeliveryZones();
  const match = zones.find((z) => normalizeArea(z.area) === normalizeArea(area));
  return match ? match.fee : DEFAULT_DELIVERY_FEE;
}
