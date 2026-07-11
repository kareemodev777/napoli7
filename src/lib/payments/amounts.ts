/**
 * Pure money math for Stripe Checkout. No SDK, no env, no I/O — so it is unit
 * testable in isolation and safe to import anywhere.
 *
 * The single rule this module enforces: the amount we send to Stripe must equal
 * the order's authoritative `total_aed` to the fil. Stripe works in the smallest
 * currency unit (fils for AED, 1 AED = 100 fils), so every amount is integer
 * fils. Floating-point AED never reaches Stripe.
 */

export interface OrderItemAmount {
  name: string;
  qty: number;
  /** The stored line total for this item (unit price × qty, incl. customizations). */
  lineTotalAed: number;
}

export interface CheckoutLine {
  name: string;
  /** Integer fils. Each line is sent to Stripe with quantity 1. */
  unitAmountFils: number;
}

/** AED (possibly fractional) → integer fils. */
export function toFils(aed: number): number {
  return Math.round(aed * 100);
}

const DELIVERY_FEE_LABEL = "Delivery fee";
const SERVICE_FEE_LABEL = "Service fee";

/**
 * Build the Stripe line items from the authoritative order rows.
 *
 * Products are emitted one-per-line at quantity 1 with the *line* total as the
 * unit amount (label carries the quantity). Charging the line total directly —
 * instead of re-deriving a per-unit price and multiplying — guarantees the
 * product subtotal equals the stored `subtotal_aed` exactly, with no per-unit
 * rounding drift. A fee line is appended for each fee that applies.
 *
 * The two fees are separate lines, not one merged "fees" line, so the customer's
 * Stripe receipt reads the same as the checkout summary they agreed to. Either can
 * be zero independently: free delivery zeroes the delivery fee while the service
 * fee stands, and pickup zeroes both.
 */
export function buildCheckoutLines(
  items: OrderItemAmount[],
  deliveryFeeAed: number,
  serviceFeeAed: number,
): CheckoutLine[] {
  const lines: CheckoutLine[] = items.map((it) => ({
    name: it.qty > 1 ? `${it.qty} × ${it.name}` : it.name,
    unitAmountFils: toFils(it.lineTotalAed),
  }));
  if (deliveryFeeAed > 0) {
    lines.push({
      name: DELIVERY_FEE_LABEL,
      unitAmountFils: toFils(deliveryFeeAed),
    });
  }
  if (serviceFeeAed > 0) {
    lines.push({
      name: SERVICE_FEE_LABEL,
      unitAmountFils: toFils(serviceFeeAed),
    });
  }
  return lines;
}

/** Gross fils across all lines (each line is quantity 1). */
export function grossFils(lines: CheckoutLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitAmountFils, 0);
}

/** Net fils Stripe will charge: gross minus any whole-order discount. */
export function netFils(lines: CheckoutLine[], discountAed: number): number {
  return grossFils(lines) - toFils(discountAed);
}

export interface CheckoutAmount {
  lines: CheckoutLine[];
  discountFils: number;
  netFils: number;
  expectedFils: number;
}

/**
 * Build the checkout amount and assert it equals the order total to the fil.
 * Throws on any mismatch so a wrong charge can never reach Stripe — this is the
 * guardrail the whole module exists for.
 */
export function buildAndAssertCheckoutAmount(input: {
  items: OrderItemAmount[];
  deliveryFeeAed: number;
  serviceFeeAed: number;
  discountAed: number;
  totalAed: number;
}): CheckoutAmount {
  const lines = buildCheckoutLines(
    input.items,
    input.deliveryFeeAed,
    input.serviceFeeAed,
  );
  const discountFils = toFils(input.discountAed);
  const net = grossFils(lines) - discountFils;
  const expectedFils = toFils(input.totalAed);

  if (
    discountFils < 0 ||
    input.deliveryFeeAed < 0 ||
    input.serviceFeeAed < 0
  ) {
    throw new Error(
      `[checkout-amount] negative input: discount=${input.discountAed} delivery=${input.deliveryFeeAed} service=${input.serviceFeeAed}`,
    );
  }
  if (net < 0) {
    throw new Error(
      `[checkout-amount] discount (${discountFils} fils) exceeds gross; net would be ${net} fils`,
    );
  }
  if (net !== expectedFils) {
    throw new Error(
      `[checkout-amount] mismatch: computed ${net} fils but order total_aed is ${expectedFils} fils. ` +
        `Refusing to create a Stripe session that charges the wrong amount.`,
    );
  }

  return { lines, discountFils, netFils: net, expectedFils };
}
