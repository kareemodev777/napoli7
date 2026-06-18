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
