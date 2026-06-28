"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartCustomization, SizeId } from "@/data/types/catalog";

export interface CartItemInput {
  productId: string;
  slug: string;
  name: string;
  nameIt: string | null;
  basePrice: number;
  unitPrice: number;
  quantity: number;
  customizations: CartCustomization[];
  imageUrl: string;
  sizeId: SizeId;
  sizeLabel: string;
  sizeDetail: string;
}

export interface CartItem extends CartItemInput {
  id: string;
}

export interface AppliedPromo {
  code: string;
  amount: number;
  /** True for the signup free-pizza reward — drives the pickup-only rule. */
  isReward?: boolean;
}

interface CartState {
  items: CartItem[];
  promo: AppliedPromo | null;
  addItem: (input: CartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  setPromo: (promo: AppliedPromo) => void;
  clearPromo: () => void;
  totalQuantity: () => number;
  subtotal: () => number;
  /** Discount in AED, clamped to never exceed the current subtotal. */
  discount: () => number;
  /** Subtotal minus discount, floored at 0. Excludes delivery fee. */
  total: () => number;
}

function customizationKey(items: CartCustomization[]) {
  return items
    .map((c) => `${c.ingredient}:${c.choice}`)
    .sort()
    .join("|");
}

function makeId(
  productId: string,
  sizeId: SizeId,
  customizations: CartCustomization[],
) {
  const key = customizationKey(customizations);
  return `${productId}#${sizeId}#${key}`;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promo: null,
      addItem: (input) => {
        const id = makeId(input.productId, input.sizeId, input.customizations);
        set((state) => {
          const existing = state.items.find((it) => it.id === id);
          if (existing) {
            return {
              items: state.items.map((it) =>
                it.id === id
                  ? { ...it, quantity: it.quantity + input.quantity }
                  : it,
              ),
            };
          }
          return { items: [...state.items, { ...input, id }] };
        });
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items
            .map((it) => (it.id === id ? { ...it, quantity } : it))
            .filter((it) => it.quantity > 0),
        }));
      },
      removeItem: (id) => {
        set((state) => ({ items: state.items.filter((it) => it.id !== id) }));
      },
      clear: () => set({ items: [], promo: null }),
      setPromo: (promo) => set({ promo }),
      clearPromo: () => set({ promo: null }),
      totalQuantity: () => get().items.reduce((s, it) => s + it.quantity, 0),
      subtotal: () =>
        get().items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      discount: () => {
        const { promo } = get();
        if (!promo) return 0;
        return Math.min(promo.amount, get().subtotal());
      },
      total: () => Math.max(0, get().subtotal() - get().discount()),
    }),
    {
      name: "napoli7-cart",
      storage: createJSONStorage(() => localStorage),
      version: 3,
      // v3 added promo state. Drop any persisted promo on upgrade so a stale
      // discount can't survive a deploy; items are preserved.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<CartState>;
        return { ...state, promo: null } as CartState;
      },
    },
  ),
);
