/**
 * The signup free-pizza reward: rules for stacking codes and for when a reward
 * order may be delivered.
 *
 * Every registered customer earns one code for a free Small Margherita. Several
 * codes may be spent on ONE order — three friends can pool theirs — and each takes
 * 19 AED off. What they cannot do is have a driver bring three free pizzas and
 * nothing else: delivery costs us more than the order is worth, so a reward order
 * only unlocks delivery once it carries at least one thing we are actually being
 * paid for.
 */

/** Face value of one reward code. */
export const REWARD_DISCOUNT_AED = 19;

/** The only category that is not food. Drinks never unlock delivery. */
const DRINK_CATEGORY = "drinks";

export interface RewardEligibilityItem {
  /** The product's catalogue category — resolved server-side, never trusted from the client. */
  categoryId: string;
  quantity: number;
}

/** Units of actual food in the order. A drink is not an upgrade, however many. */
export function countFoodUnits(items: RewardEligibilityItem[]): number {
  return items
    .filter((item) => item.categoryId !== DRINK_CATEGORY)
    .reduce((n, item) => n + item.quantity, 0);
}

/**
 * Whether a reward order carries an eligible upgrade — the thing that unlocks
 * delivery.
 *
 * `rewardCount` codes pay for `rewardCount` free pizzas, so an upgrade is any food
 * beyond those: a second small pizza, a medium one, a focaccia, a dessert, another
 * pizza of any kind. Anything we are being paid for. One upgrade is enough for the
 * whole order however many codes are stacked on it — the client was explicit that
 * three codes plus one dessert may be delivered.
 *
 * Drinks are excluded deliberately: a can of cola alongside three free pizzas is
 * not an order worth sending a driver out for.
 */
export function hasEligibleUpgrade(
  items: RewardEligibilityItem[],
  rewardCount: number,
): boolean {
  if (rewardCount <= 0) return true; // Not a reward order; the rule doesn't apply.
  return countFoodUnits(items) > rewardCount;
}

/**
 * Whether this order may ONLY be collected.
 *
 * True when reward codes are in play and nothing has been added beyond the free
 * pizzas they pay for. Pickup is always allowed — a lone free Margherita collected
 * from the counter costs us nothing to hand over, and the client wants that order
 * to be free end to end (pickup pays no fees anyway, so it already is).
 */
export function isRewardPickupOnly(
  items: RewardEligibilityItem[],
  rewardCount: number,
): boolean {
  return rewardCount > 0 && !hasEligibleUpgrade(items, rewardCount);
}

/**
 * Total money off, capped at the value of the goods.
 *
 * The cap is not cosmetic. Stripe is sent the order's line items and asserts that
 * they less the discount equal the charge; a discount larger than the basket makes
 * that sum negative and every card payment throws. Capping means the items go to
 * zero and the fees are still owed — which is exactly the intent: "customers pay
 * only the remaining balance", and the delivery and service fees are not part of
 * the reward.
 */
export function totalRewardDiscountAed(
  rewardCount: number,
  subtotalAed: number,
): number {
  const face = Math.max(0, rewardCount) * REWARD_DISCOUNT_AED;
  return Math.min(face, Math.max(0, subtotalAed));
}
