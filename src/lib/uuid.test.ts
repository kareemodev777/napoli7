import { test, expect, describe } from "bun:test";
import { isUuid } from "./uuid";

describe("isUuid — lenient UUID-format check", () => {
  test("accepts a real v4 uuid", () => {
    expect(isUuid("10d33b69-f742-4f64-a008-2b4e7cd771af")).toBe(true);
  });

  test("accepts non-RFC-4122 catalog placeholder ids (e.g. drinks)", () => {
    // Version/variant nibbles are 0 — a valid Postgres uuid, but Zod's strict
    // .uuid() rejects it. This is the id shape that broke drink checkout.
    expect(isUuid("44444444-0000-0000-0000-000000000001")).toBe(true);
  });

  test("rejects genuinely stale non-uuid ids", () => {
    expect(isUuid("margherita-classic")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid("44444444-0000-0000-0000-00000000")).toBe(false);
  });
});
