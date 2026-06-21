import { describe, expect, test } from "bun:test";
import {
  buildDeliveryMapQuery,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
  buildGpsMapsUrl,
  isWithinAjmanDeliveryArea,
} from "./delivery-map";

describe("Ajman delivery bounds", () => {
  test("accepts a pin inside Ajman (the shop)", () => {
    expect(isWithinAjmanDeliveryArea(25.4002327, 55.5033167)).toBe(true);
  });

  test("rejects a pin in Sharjah (south of the box)", () => {
    // Ajmal Makan / Sharjah Waterfront sits south of Ajman.
    expect(isWithinAjmanDeliveryArea(25.3, 55.45)).toBe(false);
  });

  test("rejects non-finite coordinates", () => {
    expect(isWithinAjmanDeliveryArea(Number.NaN, 55.5)).toBe(false);
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
