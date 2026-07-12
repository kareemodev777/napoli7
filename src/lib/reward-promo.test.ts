import { describe, expect, test } from "bun:test";
import {
  countFoodUnits,
  hasEligibleUpgrade,
  isRewardPickupOnly,
  REWARD_DISCOUNT_AED,
  totalRewardDiscountAed,
} from "./reward-promo";

const pizza = (quantity = 1) => ({ categoryId: "italian-pizza", quantity });
const dessert = (quantity = 1) => ({ categoryId: "dessert", quantity });
const focaccia = (quantity = 1) => ({ categoryId: "focaccia", quantity });
const drink = (quantity = 1) => ({ categoryId: "drinks", quantity });

describe("what counts as an upgrade", () => {
  test("drinks are not food, however many", () => {
    expect(countFoodUnits([drink(5)])).toBe(0);
    expect(countFoodUnits([pizza(1), drink(3)])).toBe(1);
  });

  test("one free pizza alone is pickup-only", () => {
    expect(isRewardPickupOnly([pizza(1)], 1)).toBe(true);
    expect(hasEligibleUpgrade([pizza(1)], 1)).toBe(false);
  });

  // The rule the client was most explicit about: a drink is not an upgrade.
  test("a drink does NOT unlock delivery", () => {
    expect(isRewardPickupOnly([pizza(1), drink(2)], 1)).toBe(true);
  });

  test("a second pizza unlocks delivery", () => {
    expect(hasEligibleUpgrade([pizza(2)], 1)).toBe(true);
  });

  test("a focaccia or a dessert unlocks delivery", () => {
    expect(hasEligibleUpgrade([pizza(1), focaccia(1)], 1)).toBe(true);
    expect(hasEligibleUpgrade([pizza(1), dessert(1)], 1)).toBe(true);
  });

  // Straight from the spec: 3 codes, 3 free Margheritas, 1 dessert -> deliverable.
  // ONE upgrade is enough for the whole order, however many codes are stacked.
  test("three codes plus a single dessert is deliverable", () => {
    expect(hasEligibleUpgrade([pizza(3), dessert(1)], 3)).toBe(true);
    expect(isRewardPickupOnly([pizza(3), dessert(1)], 3)).toBe(false);
  });

  test("three codes and three free pizzas, nothing else, is pickup-only", () => {
    expect(isRewardPickupOnly([pizza(3)], 3)).toBe(true);
  });

  test("three codes, three pizzas and a drink is still pickup-only", () => {
    expect(isRewardPickupOnly([pizza(3), drink(1)], 3)).toBe(true);
  });

  test("an order with no reward code is unaffected by any of this", () => {
    expect(hasEligibleUpgrade([drink(1)], 0)).toBe(true);
    expect(isRewardPickupOnly([drink(1)], 0)).toBe(false);
  });
});

describe("stacked discounts", () => {
  test("each code takes 19 AED off", () => {
    expect(totalRewardDiscountAed(1, 100)).toBe(REWARD_DISCOUNT_AED);
    expect(totalRewardDiscountAed(3, 100)).toBe(57);
  });

  // A discount bigger than the basket would make the Stripe reconciliation
  // negative and throw on every card order. The items go to zero; the fees stand.
  test("the discount never exceeds the goods", () => {
    expect(totalRewardDiscountAed(3, 20)).toBe(20);
    expect(totalRewardDiscountAed(1, 0)).toBe(0);
  });
});
