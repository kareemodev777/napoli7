export type CategoryId = "pizza" | "focaccia" | "dessert" | "drinks";

export type SizeId = "small" | "regular";

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
