"use client";

import { createContext, useContext, useMemo } from "react";
import {
  INACTIVE_SNAPSHOT,
  resolveMenuDiscount,
  type MenuDiscount,
  type MenuDiscountSnapshot,
} from "@/lib/menu-discount";

const MenuDiscountContext =
  createContext<MenuDiscountSnapshot>(INACTIVE_SNAPSHOT);

/**
 * Ships the raw sale config to the client once (from the root layout) and
 * resolves it against the browser clock, so the start/end boundary flips without
 * a round-trip.
 *
 * The sale applies to EVERY visitor, signed in or not — matching the server
 * (placeOrder). It deliberately does not depend on auth: it used to be withheld
 * from signed-in customers, which both made the same basket cost double once you
 * logged in and meant a failed/blocked auth lookup silently hid the sale
 * altogether. Codes are what the sale doesn't combine with, and the cart/checkout
 * enforce that by only applying it when no promo is attached.
 */
export function MenuDiscountProvider({
  value,
  children,
}: {
  value: MenuDiscount;
  children: React.ReactNode;
}) {
  const snapshot = useMemo<MenuDiscountSnapshot>(
    () => resolveMenuDiscount(value),
    [value],
  );

  return (
    <MenuDiscountContext.Provider value={snapshot}>
      {children}
    </MenuDiscountContext.Provider>
  );
}

/** The resolved sale (active + percent + label) for the current visitor. */
export function useMenuDiscount(): MenuDiscountSnapshot {
  return useContext(MenuDiscountContext);
}
