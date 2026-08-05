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
  SHOP_LOCATION,
} from "./delivery-map";
import { isInsideAjman, isInsideAjmanMainland } from "./ajman-boundary";

// A real Ajman address well past the old 7 km circle — the inland strip of the
// emirate. It is the case this whole change exists for.
const FAR_INSIDE_AJMAN: [number, number] = [25.51, 55.375];

describe("distance from the shop (informational only)", () => {
  test("the shop itself is 0 km away", () => {
    expect(distanceFromShopKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng)).toBeCloseTo(
      0,
      5,
    );
  });

  test("haversine matches a known distance (~1.11 km per 0.01° latitude)", () => {
    const d = haversineKm(25.4, 55.5, 25.41, 55.5);
    expect(d).toBeGreaterThan(1.0);
    expect(d).toBeLessThan(1.2);
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

  // The exclaves are Ajman, so isInsideAjman says yes — but they are 50 km and
  // 85 km inland and no courier goes there, so the delivery zone excludes them.
  test("the inland exclaves are Ajman but not the delivery zone", () => {
    const exclaves: [number, number][] = [
      [25.32, 55.99], // Al Manama
      [24.82, 56.05], // Masfout
    ];
    for (const [lat, lng] of exclaves) {
      expect(isInsideAjman(lat, lng)).toBe(true);
      expect(isInsideAjmanMainland(lat, lng)).toBe(false);
    }
  });
});

describe("deliverability = inside the Ajman border, at any distance", () => {
  test("accepts a pin inside Ajman", () => {
    const result = checkDeliverability(SHOP_LOCATION.lat, SHOP_LOCATION.lng);
    expect(result.deliverable).toBe(true);
    expect(result.distanceKm).toBeCloseTo(0, 5);
  });

  // The reason for the change: the courier now covers the whole emirate, so a
  // pin the old 7 km circle refused is accepted purely for being inside Ajman.
  test("accepts a pin far past the old 7 km radius, since it is inside Ajman", () => {
    const [lat, lng] = FAR_INSIDE_AJMAN;
    expect(distanceFromShopKm(lat, lng)).toBeGreaterThan(7);
    expect(checkDeliverability(lat, lng).deliverable).toBe(true);
  });

  // Distance never rescues a pin either: Sharjah is refused however close it is.
  test("rejects Sharjah even when it is nearer than parts of Ajman", () => {
    const sharjahNearby: [number, number][] = [
      [25.3442, 55.4813], // ~6.6 km south of the shop, over the Sharjah border
      [25.3622, 55.5413], // ~5.7 km south-east, also Sharjah
    ];
    for (const [lat, lng] of sharjahNearby) {
      expect(distanceFromShopKm(lat, lng)).toBeLessThan(7);
      expect(checkDeliverability(lat, lng)).toMatchObject({
        deliverable: false,
        reason: "outside-ajman",
      });
    }
  });

  test("rejects a pin dropped in the sea just off the shop", () => {
    // ~5.3 km north-west of the shop, out in the Gulf.
    expect(checkDeliverability(25.4442, 55.4833)).toMatchObject({
      deliverable: false,
      reason: "outside-ajman",
    });
  });

  test("rejects a pin in an Ajman exclave — inside the emirate, outside the zone", () => {
    expect(checkDeliverability(24.82, 56.05)).toMatchObject({
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

    const noPin = checkDeliverability(null, null);
    if (noPin.deliverable) throw new Error("expected a missing pin to be rejected");
    expect(deliverabilityMessage(noPin)).toContain("Drop a pin");
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
