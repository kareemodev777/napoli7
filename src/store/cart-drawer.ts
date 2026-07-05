"use client";

import { create } from "zustand";

/**
 * UI-only state for the slide-in cart drawer, kept separate from the cart's data
 * store so opening/closing the drawer never touches (or re-persists) cart items.
 */
interface CartDrawerState {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
  setOpen: (open: boolean) => void;
}

export const useCartDrawer = create<CartDrawerState>((set) => ({
  open: false,
  openCart: () => set({ open: true }),
  closeCart: () => set({ open: false }),
  setOpen: (open) => set({ open }),
}));
