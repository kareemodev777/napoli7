import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductDetail } from "@/components/catalog/ProductDetail";
import { RelatedProducts } from "@/components/catalog/RelatedProducts";
import { MenuItemJsonLd } from "@/components/structured-data/MenuItemJsonLd";
import {
  getProductBySlug,
  getProductSlugs,
  getRelatedProducts,
  getCatalogCategories,
} from "@/lib/catalog";

interface Params {
  slug: string;
}

export async function generateStaticParams(): Promise<Params[]> {
  const slugs = await getProductSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Not found" };
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/menu/${product.slug}` },
    openGraph: {
      title: `${product.name} · Napoli 7`,
      description: product.description,
      images: [{ url: product.imageUrl }],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [categories, related] = await Promise.all([
    getCatalogCategories(),
    getRelatedProducts(product, 3),
  ]);
  const category = categories.find((c) => c.id === product.categoryId);

  return (
    <SiteShell>
      <MenuItemJsonLd product={product} />
      <ProductDetail product={product} categoryLabel={category?.label ?? ""} />
      <RelatedProducts products={related} />
    </SiteShell>
  );
}
