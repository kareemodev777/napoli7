import { describe, expect, test } from "bun:test";
import {
  matchDeliveryZone,
  resolveDeliveryFeeFromZones,
  type DeliveryZone,
} from "./checkout";

const zones: DeliveryZone[] = [
  { area: "Al Jurf 2", fee: 10 },
  { area: "Ajman Corniche", fee: 15 },
];

describe("delivery zone matching", () => {
  test("matches supported areas case-insensitively", () => {
    expect(matchDeliveryZone(zones, " al jurf 2 ")).toEqual(zones[0]);
  });

  test("returns unsupported instead of charging a default fee", () => {
    expect(resolveDeliveryFeeFromZones(zones, "Dubai Marina")).toEqual({
      supported: false,
      fee: 0,
    });
  });

  test("returns the configured fee for supported areas", () => {
    expect(resolveDeliveryFeeFromZones(zones, "Ajman Corniche")).toEqual({
      supported: true,
      fee: 15,
    });
  });
});
