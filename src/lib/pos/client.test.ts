import { test, expect, describe } from "bun:test";
import { shouldRetry, isAlreadyAccepted } from "./client";

describe("isAlreadyAccepted — POS already-synced detection", () => {
  test("treats a duplicate voucher / invoice as already accepted", () => {
    expect(
      isAlreadyAccepted(
        "SQLSTATE[23000]: Integrity constraint violation: 1062 Duplicate entry 'INV-71' for key 'vouchers_voucher_no_unique'",
      ),
    ).toBe(true);
    expect(isAlreadyAccepted("Order already exists")).toBe(true);
    expect(isAlreadyAccepted("already processed")).toBe(true);
  });

  test("does NOT treat a genuine error as accepted", () => {
    expect(isAlreadyAccepted('Undefined array key "sku"')).toBe(false);
    expect(isAlreadyAccepted("Internal Server Error")).toBe(false);
    expect(isAlreadyAccepted("")).toBe(false);
  });
});

describe("shouldRetry — POS push retry decision", () => {
  test("retries on a thrown/aborted request (no HTTP status)", () => {
    expect(shouldRetry({ errored: true })).toBe(true);
    expect(shouldRetry({})).toBe(true);
    expect(shouldRetry({ status: undefined })).toBe(true);
  });

  test("retries on 5xx server errors", () => {
    expect(shouldRetry({ status: 500 })).toBe(true);
    expect(shouldRetry({ status: 502 })).toBe(true);
    expect(shouldRetry({ status: 503 })).toBe(true);
  });

  test("retries on 429 rate limiting", () => {
    expect(shouldRetry({ status: 429 })).toBe(true);
  });

  test("does NOT retry other 4xx (contract/auth errors)", () => {
    expect(shouldRetry({ status: 400 })).toBe(false);
    expect(shouldRetry({ status: 401 })).toBe(false);
    expect(shouldRetry({ status: 403 })).toBe(false);
    expect(shouldRetry({ status: 404 })).toBe(false);
    expect(shouldRetry({ status: 422 })).toBe(false);
  });

  test("does NOT retry a 2xx success", () => {
    expect(shouldRetry({ status: 200 })).toBe(false);
    expect(shouldRetry({ status: 201 })).toBe(false);
  });
});
