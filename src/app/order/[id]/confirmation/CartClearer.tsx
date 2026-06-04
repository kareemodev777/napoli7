"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Clears the local persisted cart once the order is actually confirmed. */
export function CartClearer() {
  const clearCart = useCart((s) => s.clear);

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return null;
}
