# ADR-005: Cart State Management

**Date:** 2026-04-30
**Status:** Accepted

## Context

The cart stores line items (product + customizations + quantity) between the menu and checkout. Two approaches considered:

| Option | Storage | Persistence | Server-access | Complexity |
|--------|---------|-------------|---------------|------------|
| Zustand + localStorage | Client | Browser session | Via API | Low |
| Server-side cart (Supabase) | DB | Cross-device | Direct | High |

## Decision

**Zustand store + localStorage for v1. Persist to Supabase only after the user logs in.**

Reasoning:

1. The vast majority of takeaway orders follow a single-session flow: open site, add items, checkout. Cross-device persistence (add on phone, pay on desktop) is not a meaningful use case for a pizza shop.
2. A server-side cart requires a cart session table, an anonymous-session mechanism, and merge logic when a guest logs in. This is substantial engineering for a problem that doesn't exist in the target UX.
3. Zustand with localStorage gives instant optimistic updates with zero latency. No API roundtrip on "Add to cart".
4. When the user is logged in, the same Zustand store is the source of truth during the session. On logout, cart is cleared (or optionally saved to `saved_carts` table for recovery — deferred to Phase 6).

## Type Definition

```ts
// src/store/cart.ts
export interface CartCustomization {
  ingredient: string
  choice: 'default' | 'extra' | 'without'
  extraPrice: number   // 0 if choice != 'extra'
}

export interface CartItem {
  id: string                  // uuid, stable per line item
  productId: string
  slug: string
  name: string
  basePrice: number
  quantity: number
  customizations: CartCustomization[]
  lineTotal: number           // basePrice + sum(extraPrice) * quantity
}

export interface CartStore {
  items: CartItem[]
  add: (item: Omit<CartItem, 'id' | 'lineTotal'>) => void
  remove: (id: string) => void
  updateQty: (id: string, qty: number) => void
  clear: () => void
  totals: () => { subtotal: number; itemCount: number }
}
```

## Consequences

Positive:
- Zero server load for cart operations.
- Instant UI — no loading states on add/remove.
- Simple implementation.

Negative:
- Cart lost if browser storage is cleared.
- No cross-device sync in v1.
