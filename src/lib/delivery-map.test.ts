import { describe, expect, test } from "bun:test";
import {
  buildDeliveryMapQuery,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  buildGpsMapsUrl,
  distanceFromShopKm,
  haversineKm,
  isWithinDeliveryRadius,
  SHOP_LOCATION,
} from "./delivery-map";

describe("delivery radius (7 km straight-line)", () => {
  test("the shop itself is 0 km away and in range", () => {
    expect(distanceFromShopKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng)).toBeCloseTo(
      0,
      5,
    );
    expect(isWithinDeliveryRadius(SHOP_LOCATION.lat, SHOP_LOCATION.lng)).toBe(
      true,
    );
  });

  test("haversine matches a known distance (~1.11 km per 0.01° latitude)", () => {
    const d = haversineKm(25.4, 55.5, 25.41, 55.5);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
  });

  test("a point just inside the radius is accepted, just outside is rejected", () => {
    // ~0.05° north ≈ 5.5 km (in range); ~0.08° north ≈ 8.9 km (out of range).
    expect(
      isWithinDeliveryRadius(SHOP_LOCATION.lat + 0.05, SHOP_LOCATION.lng),
    ).toBe(true);
    expect(
      isWithinDeliveryRadius(SHOP_LOCATION.lat + 0.08, SHOP_LOCATION.lng),
    ).toBe(false);
  });

  test("rejects non-finite coordinates", () => {
    expect(isWithinDeliveryRadius(Number.NaN, 55.5)).toBe(false);
  });

  test("builds a driver GPS maps link", () => {
    expect(buildGpsMapsUrl(25.4, 55.5)).toBe(
      "https://www.google.com/maps/search/?api=1&query=25.4,55.5",
    );
  });
});

describe("delivery map helpers", () => {
  test("builds a readable query from address parts", () => {
    expect(
      buildDeliveryMapQuery({
        street: "Sheikh Rashid bin Abdul Aziz St, Building 213",
        area: "Al Jurf 2",
        flat: "1204",
      }),
    ).toBe("Sheikh Rashid bin Abdul Aziz St, Building 213, Flat 1204, Al Jurf 2, Ajman, UAE");
  });

  test("returns an empty query when nothing is entered", () => {
    expect(buildDeliveryMapQuery({})).toBe("");
  });

  test("creates matching Google Maps URLs", () => {
    const query = "Al Jurf 2, Ajman, UAE";
    expect(buildGoogleMapsSearchUrl(query)).toContain(encodeURIComponent(query));
    expect(buildGoogleMapsEmbedUrl(query)).toContain(encodeURIComponent(query));
  });
});
