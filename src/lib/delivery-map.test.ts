import { describe, expect, test } from "bun:test";
import {
  buildDeliveryMapQuery,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  buildGpsMapsUrl,
  checkDeliverability,
  deliverabilityMessage,
  distanceFromShopKm,
  haversineKm,
  isWithinDeliveryRadius,
  SHOP_LOCATION,
} from "./delivery-map";
import { isInsideAjman } from "./ajman-boundary";

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

describe("Ajman boundary", () => {
  test("the shop and every served area sit inside Ajman", () => {
    const areas: [string, number, number][] = [
      ["Napoli 7 (Al Jurf)", SHOP_LOCATION.lat, SHOP_LOCATION.lng],
      ["Ajman Corniche", 25.4052, 55.4406],
      ["Al Nuaimiya", 25.3835, 55.464],
      ["Al Rashidiya", 25.403, 55.456],
      ["Al Zorah", 25.432, 55.515],
      ["Al Mowaihat", 25.372, 55.483],
      ["Al Rawda", 25.383, 55.488],
      ["Al Helio", 25.369, 55.517],
      ["Ajman Industrial Area", 25.38, 55.503],
      ["Emirates City", 25.426, 55.556],
    ];
    for (const [name, lat, lng] of areas) {
      expect(`${name}: ${isInsideAjman(lat, lng)}`).toBe(`${name}: true`);
    }
  });

  test("Sharjah is outside Ajman", () => {
    expect(isInsideAjman(25.3463, 55.4209)).toBe(false); // Sharjah city centre
    expect(isInsideAjman(25.29, 55.49)).toBe(false); // Sharjah University City
  });

  test("rejects non-finite coordinates", () => {
    expect(isInsideAjman(Number.NaN, 55.5)).toBe(false);
  });
});

describe("deliverability = inside the radius AND inside Ajman", () => {
  test("accepts a pin that clears both checks", () => {
    const result = checkDeliverability(SHOP_LOCATION.lat, SHOP_LOCATION.lng);
    expect(result.deliverable).toBe(true);
    expect(result.distanceKm).toBeCloseTo(0, 5);
  });

  test("rejects a pin beyond the radius", () => {
    const result = checkDeliverability(SHOP_LOCATION.lat + 0.08, SHOP_LOCATION.lng);
    expect(result).toMatchObject({ deliverable: false, reason: "outside-radius" });
  });

  // The whole point of the boundary check. These pins pass the 7 km test and
  // would have been accepted before it existed.
  test("rejects Sharjah even when it is well within 7 km", () => {
    const sharjahNearby: [number, number][] = [
      [25.3442, 55.4813], // ~6.6 km south of the shop, over the Sharjah border
      [25.3622, 55.5413], // ~5.7 km south-east, also Sharjah
    ];
    for (const [lat, lng] of sharjahNearby) {
      expect(isWithinDeliveryRadius(lat, lng)).toBe(true);
      expect(checkDeliverability(lat, lng)).toMatchObject({
        deliverable: false,
        reason: "outside-ajman",
      });
    }
  });

  test("rejects a pin dropped in the sea inside the radius", () => {
    // ~5.3 km north-west of the shop, out in the Gulf.
    expect(isWithinDeliveryRadius(25.4442, 55.4833)).toBe(true);
    expect(checkDeliverability(25.4442, 55.4833)).toMatchObject({
      deliverable: false,
      reason: "outside-ajman",
    });
  });

  test("rejects a missing pin", () => {
    expect(checkDeliverability(null, null)).toMatchObject({
      deliverable: false,
      reason: "no-pin",
    });
  });

  test("each rejection explains itself, and Sharjah is named as the reason", () => {
    const sharjah = checkDeliverability(25.3442, 55.4813);
    if (sharjah.deliverable) throw new Error("expected Sharjah to be rejected");
    expect(deliverabilityMessage(sharjah)).toContain("Ajman");

    const tooFar = checkDeliverability(SHOP_LOCATION.lat + 0.08, SHOP_LOCATION.lng);
    if (tooFar.deliverable) throw new Error("expected an out-of-range rejection");
    expect(deliverabilityMessage(tooFar)).toContain("7 km");
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
