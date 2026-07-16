export type CategoryId = string;

export const SIZE_OPTIONS = [
  { id: "regular", label: "Regular" },
  { id: "small", label: "Small" },
  { id: "large", label: "Large" },
  { id: "family", label: "Family" },
] as const;

export type SizeId = (typeof SIZE_OPTIONS)[number]["id"];

export function isSizeId(id: string): id is SizeId {
  return SIZE_OPTIONS.some((option) => option.id === id);
}

// Sizes always read smallest to largest, whatever order the rows were saved in.
// The stored `position` column can't be trusted for this — the admin size form
// doesn't set it, so it collapses to 0 — and for a fixed size enum the natural
// order is what customers expect anyway (Small before a Large, never the reverse).
const SIZE_RANK: Record<SizeId, number> = {
  small: 0,
  regular: 1,
  large: 2,
  family: 3,
};

export function compareSizes(a: SizeId, b: SizeId): number {
  return SIZE_RANK[a] - SIZE_RANK[b];
}

/**
 * The size a product card/page should select (and price) on first load. Prefer
 * Medium (`regular`) — the headline price customers expect on a pizza menu — and
 * fall back to the smallest available size for products that have no Medium (a
 * two-size item, a drink). The size selector still lists sizes smallest-to-largest;
 * this only decides which one starts selected.
 */
export function defaultDisplaySizeId(sizes: readonly { id: SizeId }[]): SizeId {
  return (
    sizes.find((s) => s.id === "regular")?.id ?? sizes[0]?.id ?? "regular"
  );
}

export interface Category {
  id: CategoryId;
  label: string;
  description: string;
  position: number;
}

export interface ProductSize {
  id: SizeId;
  label: string;
  detail: string;
  price: number;
}

export interface ProductCustomization {
  ingredient: string;
  extraPrice: number | null;
  removable: boolean;
  position: number;
}

export interface Product {
  id: string;
  slug: string;
  categoryId: CategoryId;
  name: string;
  nameIt: string | null;
  description: string;
  price: number;
  sizes: ProductSize[];
  isVeg: boolean;
  isSpicy: boolean;
  isActive: boolean;
  isTemporarilyUnavailable?: boolean;
  position: number;
  imageUrl: string;
  customizations: ProductCustomization[];
}

export type CustomizationChoice = "default" | "extra" | "without";

export interface CartCustomization {
  ingredient: string;
  choice: CustomizationChoice;
  extraPrice: number;
}
