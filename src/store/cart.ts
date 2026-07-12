"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartCustomization, SizeId } from "@/data/types/catalog";

export interface CartItemInput {
  productId: string;
  /** The catalogue category. Drives the reward-upgrade rule (drinks are not food).
   *  Advisory only — the server re-reads it from the database before it decides. */
  categoryId: string;
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
  /** Several codes may be spent on one order — friends pool their free-pizza
   *  rewards — so this is a list, not a single promo. */
  promos: AppliedPromo[];
  addItem: (input: CartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  /** Adds a code. Re-applying one already on the order is a no-op, not a double
   *  discount — a code is worth 19 AED once. */
  addPromo: (promo: AppliedPromo) => void;
  removePromo: (code: string) => void;
  clearPromos: () => void;
  /** How many signup-reward codes are on the order — the number of free pizzas. */
  rewardCount: () => number;
  totalQuantity: () => number;
  subtotal: () => number;
  /** Discount in AED, clamped to never exceed the current subtotal. */
  discount: () => number;
  /** Subtotal minus discount, floored at 0. Excludes the fees. */
  total: () => number;
}

// Real menu products use UUID ids. A persisted cart item with a non-UUID id is
// stale (from an older/demo menu) and can never be ordered — checkout rejects it
// with "your cart is out of date". We drop such items on rehydrate so a stale
// localStorage cart self-heals instead of dead-ending the customer at payment.
const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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
      promos: [],
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
      clear: () => set({ items: [], promos: [] }),
      addPromo: (promo) =>
        set((state) =>
          state.promos.some((p) => p.code === promo.code)
            ? state
            : { promos: [...state.promos, promo] },
        ),
      removePromo: (code) =>
        set((state) => ({
          promos: state.promos.filter((p) => p.code !== code),
        })),
      clearPromos: () => set({ promos: [] }),
      rewardCount: () => get().promos.filter((p) => p.isReward).length,
      totalQuantity: () => get().items.reduce((s, it) => s + it.quantity, 0),
      subtotal: () =>
        get().items.reduce((s, it) => s + it.unitPrice * it.quantity, 0),
      // Capped at the subtotal: a discount larger than the basket would make the
      // Stripe reconciliation negative and throw on every card order. The items go
      // to zero and the fees are still owed, which is the intent.
      discount: () => {
        const face = get().promos.reduce((sum, p) => sum + p.amount, 0);
        return Math.min(face, get().subtotal());
      },
      total: () => Math.max(0, get().subtotal() - get().discount()),
    }),
    {
      name: "napoli7-cart",
      storage: createJSONStorage(() => localStorage),
      version: 5,
      // v3 added promo state; v4 dropped stale (non-UUID) items from an older
      // menu; v5 replaces the single `promo` with a list and adds categoryId to
      // items. A cart persisted before v5 has neither, and an item with no
      // category cannot be judged against the reward rule — so drop the items too
      // rather than guess. Promos are always reset, so a stale discount can never
      // survive a deploy.
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<CartState>;
        const items = (state.items ?? []).filter(
          (it) => UUID_RE.test(it.productId) && Boolean(it.categoryId),
        );
        return { ...state, items, promos: [] } as CartState;
      },
    },
  ),
);
