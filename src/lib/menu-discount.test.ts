import { expect, test } from "bun:test";
import {
  discountedPriceAed,
  menuDiscountAmountAed,
  normalizeMenuDiscountPercent,
  resolveMenuDiscount,
  type MenuDiscount,
} from "./menu-discount";

const GRAND_OPENING: MenuDiscount = {
  enabled: true,
  percent: 50,
  startsAt: "2026-07-28T00:00:00+04:00",
  endsAt: "2026-08-28T23:59:59+04:00",
  label: "Grand Opening – 50% OFF",
};

const at = (iso: string) => Date.parse(iso);

test("is inactive before the window opens", () => {
  const snap = resolveMenuDiscount(GRAND_OPENING, at("2026-07-27T12:00:00+04:00"));
  expect(snap.active).toBe(false);
  expect(snap.percent).toBe(0);
});

test("is active inside the window", () => {
  const snap = resolveMenuDiscount(GRAND_OPENING, at("2026-08-01T12:00:00+04:00"));
  expect(snap.active).toBe(true);
  expect(snap.percent).toBe(50);
});

test("is inactive after the window closes", () => {
  const snap = resolveMenuDiscount(GRAND_OPENING, at("2026-08-29T00:30:00+04:00"));
  expect(snap.active).toBe(false);
});

test("disabled config is never active even inside the window", () => {
  const snap = resolveMenuDiscount(
    { ...GRAND_OPENING, enabled: false },
    at("2026-08-01T12:00:00+04:00"),
  );
  expect(snap.active).toBe(false);
});

test("null bounds mean no start/end limit", () => {
  const open: MenuDiscount = { ...GRAND_OPENING, startsAt: null, endsAt: null };
  expect(resolveMenuDiscount(open, at("2020-01-01T00:00:00Z")).active).toBe(true);
  expect(resolveMenuDiscount(open, at("2999-01-01T00:00:00Z")).active).toBe(true);
});

test("amount is the percent of the item subtotal, rounded to cents", () => {
  const snap = resolveMenuDiscount(GRAND_OPENING, at("2026-08-01T12:00:00+04:00"));
  expect(menuDiscountAmountAed(43, snap)).toBe(21.5);
  expect(menuDiscountAmountAed(0, snap)).toBe(0);
  // 29.99 * 0.5 = 14.995 → 15.00 (round, not truncate)
  expect(menuDiscountAmountAed(29.99, snap)).toBe(15);
});

test("amount is zero when the sale is not live", () => {
  const snap = resolveMenuDiscount(GRAND_OPENING, at("2026-07-01T12:00:00+04:00"));
  expect(menuDiscountAmountAed(100, snap)).toBe(0);
});

test("discountedPriceAed halves the price while live, and is a no-op otherwise", () => {
  const live = resolveMenuDiscount(GRAND_OPENING, at("2026-08-01T12:00:00+04:00"));
  const before = resolveMenuDiscount(GRAND_OPENING, at("2026-07-01T12:00:00+04:00"));
  expect(discountedPriceAed(43, live)).toBe(21.5);
  expect(discountedPriceAed(43, before)).toBe(43);
});

test("normalizeMenuDiscountPercent clamps to 0–100", () => {
  expect(normalizeMenuDiscountPercent(50)).toBe(50);
  expect(normalizeMenuDiscountPercent(-5)).toBe(0);
  expect(normalizeMenuDiscountPercent(250)).toBe(100);
  expect(normalizeMenuDiscountPercent(Number.NaN)).toBe(0);
  expect(normalizeMenuDiscountPercent(33.333)).toBe(33.33);
});
