import { expect, test } from "bun:test";
import en from "./en.json";

test("location copy stays aligned across the public site", () => {
  expect(en.brand.addressLine1).toBe("Shop 4, opposite Delta Supermarket");
  expect(en.brand.addressLine2).toBe(
    "213 Sheikh Rashid bin Abdul Aziz Street, Al Jurf 2, Ajman",
  );
  expect(en.brand.hours).toBe("Tuesday to Sunday: 12:30 – 00:00");
  expect(en.brand.lat).toBeCloseTo(25.4002327, 7);
  expect(en.brand.lng).toBeCloseTo(55.5033167, 7);
});
