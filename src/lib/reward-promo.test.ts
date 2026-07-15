import { describe, expect, test } from "bun:test";
import {
  foodSubtotalAed,
  hasEligibleUpgrade,
  isRewardPickupOnly,
  REWARD_DISCOUNT_AED,
  totalRewardDiscountAed,
} from "./reward-promo";

// The free reward is a Small Margherita, worth 19 AED — so one code discounts 19.
const REWARD = 19;
// A pizza line at a given AED value; the free Small is 19, a Large is dearer.
const smallPizza = (lineTotalAed = 19) => ({
  categoryId: "italian-pizza",
  lineTotalAed,
});
const bigPizza = (lineTotalAed = 39) => ({
  categoryId: "italian-pizza",
  lineTotalAed,
});
const dessert = (lineTotalAed = 15) => ({ categoryId: "dessert", lineTotalAed });
const focaccia = (lineTotalAed = 22) => ({ categoryId: "focaccia", lineTotalAed });
const drink = (lineTotalAed = 6) => ({ categoryId: "drinks", lineTotalAed });

describe("what counts as an upgrade", () => {
  test("drinks carry no food value, at any price", () => {
    expect(foodSubtotalAed([drink(20)])).toBe(0);
    expect(foodSubtotalAed([smallPizza(19), drink(9)])).toBe(19);
  });

  test("one free pizza alone is pickup-only", () => {
    expect(isRewardPickupOnly([smallPizza()], 1, REWARD)).toBe(true);
    expect(hasEligibleUpgrade([smallPizza()], 1, REWARD)).toBe(false);
  });

  // The change the client asked for: swapping the free Small for a bigger pizza
  // adds no item, but it adds money — and that unlocks delivery.
  test("upgrading the free Small to a bigger pizza unlocks delivery", () => {
    expect(hasEligibleUpgrade([bigPizza(39)], 1, REWARD)).toBe(true);
    expect(isRewardPickupOnly([bigPizza(39)], 1, REWARD)).toBe(false);
  });

  // The rule the client was most explicit about: a drink is not an upgrade.
  test("a drink does NOT unlock delivery", () => {
    expect(isRewardPickupOnly([smallPizza(19), drink(12)], 1, REWARD)).toBe(true);
  });

  test("a second pizza unlocks delivery", () => {
    expect(hasEligibleUpgrade([smallPizza(19), smallPizza(19)], 1, REWARD)).toBe(
      true,
    );
  });

  test("a focaccia or a dessert unlocks delivery", () => {
    expect(hasEligibleUpgrade([smallPizza(19), focaccia()], 1, REWARD)).toBe(
      true,
    );
    expect(hasEligibleUpgrade([smallPizza(19), dessert()], 1, REWARD)).toBe(true);
  });

  // Straight from the spec: 3 codes, 3 free Margheritas, 1 dessert -> deliverable.
  // ONE upgrade is enough for the whole order, however many codes are stacked.
  test("three codes plus a single dessert is deliverable", () => {
    const items = [smallPizza(19), smallPizza(19), smallPizza(19), dessert()];
    expect(hasEligibleUpgrade(items, 3, 3 * REWARD)).toBe(true);
    expect(isRewardPickupOnly(items, 3, 3 * REWARD)).toBe(false);
  });

  test("three codes and three free pizzas, nothing else, is pickup-only", () => {
    const items = [smallPizza(19), smallPizza(19), smallPizza(19)];
    expect(isRewardPickupOnly(items, 3, 3 * REWARD)).toBe(true);
  });

  test("three codes, three pizzas and a drink is still pickup-only", () => {
    const items = [smallPizza(19), smallPizza(19), smallPizza(19), drink()];
    expect(isRewardPickupOnly(items, 3, 3 * REWARD)).toBe(true);
  });

  test("an order with no reward code is unaffected by any of this", () => {
    expect(hasEligibleUpgrade([drink()], 0, 0)).toBe(true);
    expect(isRewardPickupOnly([drink()], 0, 0)).toBe(false);
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
