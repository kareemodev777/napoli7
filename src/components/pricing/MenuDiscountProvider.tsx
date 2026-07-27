"use client";

import { createContext, useContext, useMemo } from "react";
import { useAuthState } from "@/components/site/AuthMenu";
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
 * resolves it against two things: the browser clock (so the start/end boundary
 * flips without a round-trip) and the customer's auth state.
 *
 * The Grand Opening 50% is for GUESTS ONLY — signed-in customers get the Free
 * Pizza reward instead. So the sale is gated to signed-out visitors here, exactly
 * as the checkout server action gates the actual discount. Auth is resolved on
 * the client (see useAuthState) so storefront pages stay statically rendered.
 */
export function MenuDiscountProvider({
  value,
  children,
}: {
  value: MenuDiscount;
  children: React.ReactNode;
}) {
  const authState = useAuthState();

  const snapshot = useMemo<MenuDiscountSnapshot>(() => {
    // Only guests see the sale. While auth is still resolving ("loading") we
    // withhold it too, so a signed-in customer never flashes a sale price.
    if (authState !== "out") return INACTIVE_SNAPSHOT;
    return resolveMenuDiscount(value);
  }, [value, authState]);

  return (
    <MenuDiscountContext.Provider value={snapshot}>
      {children}
    </MenuDiscountContext.Provider>
  );
}

/** The resolved sale (active + percent + label) for the current visitor — always
 *  inactive for signed-in customers. */
export function useMenuDiscount(): MenuDiscountSnapshot {
  return useContext(MenuDiscountContext);
}
