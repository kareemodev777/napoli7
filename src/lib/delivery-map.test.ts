import { describe, expect, test } from "bun:test";
import {
  buildDeliveryMapQuery,
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsSearchUrl,
} from "./delivery-map";

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
