import {
  isSizeId,
  type Category,
  type Product,
  type ProductCustomization,
  type ProductSize,
  type SizeId,
} from "@/data/types/catalog";
import {
  CATEGORIES as MOCK_CATEGORIES,
  PRODUCTS as MOCK_PRODUCTS,
  getActiveProducts as getMockActiveProducts,
  getProductBySlug as getMockProductBySlug,
  getRelatedProducts as getMockRelatedProducts,
} from "@/data/mock/catalog";
import { HAS_SUPABASE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

type CategoryRow = {
  id: string;
  label: string;
  description: string;
  position: number;
};

type ProductRow = {
  id: string;
  slug: string;
  category_id: string;
  name: string;
  name_it: string | null;
  description: string;
  price_aed: number | string;
  is_veg: boolean;
  is_spicy: boolean;
  is_active: boolean;
  is_temporarily_unavailable?: boolean;
  position: number;
  image_url: string;
  product_customizations?: CustomizationRow[];
  product_sizes?: SizeRow[];
};

type CustomizationRow = {
  ingredient: string;
  extra_price: number | string | null;
  removable: boolean;
  position: number;
};

type SizeRow = {
  size_id: string;
  label: string;
  detail: string;
  price_aed: number | string;
  position: number;
};

const LOCAL_PRODUCT_IMAGES: Record<string, string> = {
  "margherita-classic": "margherita-classic.jpg",
  vegetable: "vegetable-ortolana.jpg",
  "vegetable-ortolana": "vegetable-ortolana.jpg",
  merguez: "merguez.jpg",
  "spicy-peperoni": "diavola-piccante.jpg",
  "diavola-piccante": "diavola-piccante.jpg",
  "four-season": "quattro-stagioni.jpg",
  "quattro-stagioni": "quattro-stagioni.jpg",
  "bresaola-truffle": "bresaola-truffle.jpg",
  "prosciutto-rucola": "prosciutto-rucola.jpg",
  "focaccia-vegetables": "focaccia-vegetables.jpg",
  "focaccia-spicy-pepperoni": "focaccia-spicy-pepperoni.jpg",
  "focaccia-bresaola": "focaccia-bresaola.jpg",
  "focaccia-veal-ham": "focaccia-veal-ham.jpg",
  "focaccia-prosciutto-rucola": "focaccia-prosciutto-rucola.jpg",
  "nutella-pizza": "nutella-pizza.jpg",
  "lotus-biscoff-pizza": "lotus-biscoff-pizza.jpg",
  "pistachio-pizza": "pistachio-pizza.jpg",
  water: "water.jpg",
  pepsi: "pepsi.jpg",
  "coca-cola": "coca-cola.jpg",
  mirinda: "mirinda.jpg",
  "mountain-dew": "mountain-dew.jpg",
  "7-up": "7up.jpg",
  "7up": "7up.jpg",
  sprite: "sprite.jpg",
  fanta: "fanta.jpg",
};

function imageKeyFromUrl(imageUrl: string): string | null {
  try {
    const pathname = imageUrl.startsWith("http")
      ? new URL(imageUrl).pathname
      : imageUrl;
    const filename = pathname.split("/").pop()?.replace(/\.[^.]+$/, "");
    return filename?.replace(/-\d{8,}$/, "") ?? null;
  } catch {
    return null;
  }
}

function resolveProductImageUrl(row: ProductRow): string {
  const url = row.image_url?.trim() ?? "";

  // Admin-uploaded images live in Supabase Storage and are authoritative — an
  // owner who uploads a new photo must see it on the website. Never override an
  // uploaded URL with a bundled local file (this was hiding updated images,
  // e.g. the dessert pizzas, whose slugs collide with LOCAL_PRODUCT_IMAGES).
  if (url.includes("/storage/v1/object/")) return url;

  // Otherwise this is a seed/placeholder value — map it to a bundled image.
  const key = imageKeyFromUrl(url);
  const filename =
    (key ? LOCAL_PRODUCT_IMAGES[key] : undefined) ??
    LOCAL_PRODUCT_IMAGES[row.slug];

  return filename ? `/images/products/${filename}` : url;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    position: row.position,
  };
}

export function normalizeProductSizes(
  categoryId: string,
  sizes: ProductSize[],
  fallbackPrice: number,
): ProductSize[] {
  if (categoryId === "focaccia" && sizes.length > 0) {
    return [
      {
        ...sizes[0],
        label: "One size",
        detail: "",
      },
    ];
  }

  if (sizes.length > 0) return sizes;

  return [
    {
      id: "regular",
      label: "Regular",
      detail: "",
      price: fallbackPrice,
    },
  ];
}

function mapProduct(row: ProductRow): Product {
  const sizes: ProductSize[] = (row.product_sizes ?? [])
    .filter((size) => isSizeId(size.size_id))
    .sort((a, b) => a.position - b.position)
    .map((size) => ({
      id: size.size_id as SizeId,
      label: size.label,
      detail: size.detail,
      price: Number(size.price_aed),
    }));

  const normalizedSizes = normalizeProductSizes(
    row.category_id,
    sizes,
    Number(row.price_aed),
  );

  const customizations: ProductCustomization[] = (
    row.product_customizations ?? []
  )
    .sort((a, b) => a.position - b.position)
    .map((customization) => ({
      ingredient: customization.ingredient,
      extraPrice:
        customization.extra_price === null
          ? null
          : Number(customization.extra_price),
      removable: customization.removable,
      position: customization.position,
    }));

  return {
    id: row.id,
    slug: row.slug,
    categoryId: row.category_id,
    name: row.name,
    nameIt: row.name_it,
    description: row.description,
    price: Number(row.price_aed),
    sizes:
      normalizedSizes.length > 0
        ? normalizedSizes
        : [
            {
              id: "regular",
              label: "Regular",
              detail: "",
              price: Number(row.price_aed),
            },
          ],
    isVeg: row.is_veg,
    isSpicy: row.is_spicy,
    isActive: row.is_active,
    isTemporarilyUnavailable: row.is_temporarily_unavailable ?? false,
    position: row.position,
    imageUrl: resolveProductImageUrl(row),
    customizations,
  };
}

async function loadSupabaseCatalog() {
  if (!HAS_SUPABASE) return null;

  try {
    const supabase = createServiceRoleClient();
    const [{ data: categoryRows, error: categoryError }, { data, error }] =
      await Promise.all([
        supabase.from("categories").select("*").order("position"),
        supabase
          .from("products")
          .select("*, product_customizations(*), product_sizes(*)")
          .order("position"),
      ]);

    if (categoryError || error) {
      console.error("[catalog] Supabase catalog load failed", {
        categoryError,
        error,
      });
      return null;
    }

    const categories = ((categoryRows ?? []) as CategoryRow[]).map(
      mapCategory,
    );
    const products = ((data ?? []) as ProductRow[]).map(mapProduct);

    if (categories.length === 0) return null;
    return { categories, products };
  } catch (error) {
    console.error("[catalog] Supabase catalog load failed", error);
    return null;
  }
}

export async function getCatalogCategories(): Promise<Category[]> {
  const catalog = await loadSupabaseCatalog();
  return catalog?.categories ?? MOCK_CATEGORIES;
}

export async function getActiveProducts(): Promise<Product[]> {
  const catalog = await loadSupabaseCatalog();
  if (!catalog) return getMockActiveProducts();

  return catalog.products
    .filter((product) => product.isActive)
    .sort((a, b) => {
      const categorySort =
        catalog.categories.findIndex((cat) => cat.id === a.categoryId) -
        catalog.categories.findIndex((cat) => cat.id === b.categoryId);
      if (categorySort !== 0) return categorySort;
      return a.position - b.position;
    });
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const catalog = await loadSupabaseCatalog();
  if (!catalog) return getMockProductBySlug(slug);
  return catalog.products.find(
    (product) => product.slug === slug && product.isActive,
  );
}

export async function getRelatedProducts(
  product: Product,
  count = 3,
): Promise<Product[]> {
  const catalog = await loadSupabaseCatalog();
  if (!catalog) return getMockRelatedProducts(product, count);

  const active = catalog.products.filter((p) => p.isActive);
  const same = active.filter(
    (p) => p.categoryId === product.categoryId && p.id !== product.id,
  );
  const others = active.filter((p) => p.categoryId !== product.categoryId);
  return [...same, ...others].slice(0, count);
}

export async function getProductSlugs(): Promise<string[]> {
  const catalog = await loadSupabaseCatalog();
  return (catalog?.products ?? MOCK_PRODUCTS)
    .filter((product) => product.isActive)
    .map((product) => product.slug);
}
