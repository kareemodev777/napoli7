import type { SizeId } from "@/data/types/catalog";

export type CategoryRow = {
  id: string;
  label: string;
  description: string;
  position: number;
};

export type ProductSizeRow = {
  id: string;
  product_id: string;
  size_id: SizeId;
  label: string;
  detail: string;
  price_aed: string | number;
  position: number;
};

export type CustomizationRow = {
  id: string;
  product_id: string;
  ingredient: string;
  extra_price: string | number | null;
  removable: boolean;
  position: number;
};

export type ProductRow = {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  name_it: string | null;
  description: string;
  price_aed: string | number;
  image_url: string;
  position: number;
  is_veg: boolean;
  is_spicy: boolean;
  is_active: boolean;
  is_temporarily_unavailable?: boolean;
  product_sizes: ProductSizeRow[];
  product_customizations: CustomizationRow[];
};
