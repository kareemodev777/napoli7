/**
 * Pure helpers for reconciling a checkout delivery address with a customer's
 * saved addresses. Used by placeOrder to decide whether to persist a new
 * address and whether it should become the default.
 */

export interface AddressLike {
  street: string;
  area: string;
  flat?: string | null;
}

function norm(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Stable identity for an address: street + area + flat, normalized. */
export function addressKey(address: AddressLike): string {
  return [norm(address.street), norm(address.area), norm(address.flat)].join(
    "|",
  );
}

export function addressExists(
  existing: AddressLike[],
  candidate: AddressLike,
): boolean {
  const key = addressKey(candidate);
  return existing.some((a) => addressKey(a) === key);
}

/**
 * Decide what to do with a checkout delivery address for a logged-in customer.
 * Save it only when it's genuinely new; make it the default only when it's the
 * customer's first saved address.
 */
export function planAddressSave(
  existing: AddressLike[],
  candidate: AddressLike,
): { shouldSave: boolean; makeDefault: boolean } {
  if (addressExists(existing, candidate)) {
    return { shouldSave: false, makeDefault: false };
  }
  return { shouldSave: true, makeDefault: existing.length === 0 };
}
