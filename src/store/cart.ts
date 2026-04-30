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

interface CartState {
  items: CartItem[];
  addItem: (input: CartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  totalQuantity: () => number;
  subtotal: () => number;
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
      clear: () => set({ items: [] }),
      totalQuantity: () => get().items.reduce((s, it) => s + it.quantity, 0),
      subtotal: () =>
        get().items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
    }),
    {
      name: "napoli7-cart",
      storage: createJSONStorage(() => localStorage),
      version: 2,
    },
  ),
);
