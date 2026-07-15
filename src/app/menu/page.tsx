import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { MenuLayout } from "@/components/catalog/MenuLayout";
import { getActiveProducts, getCatalogCategories } from "@/lib/catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the Napoli 7 menu — the Ajman Pizza Collection, Italian classics, focaccia sandwiches, dessert pizzas, and cold drinks.",
  alternates: { canonical: "/menu" },
  openGraph: {
    title: "Menu · Napoli 7",
    description:
      "Ajman originals, Italian classics, focaccia sandwiches, dessert pizzas, and drinks. Order online.",
  },
};

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getActiveProducts(),
    getCatalogCategories(),
  ]);
  return (
    <SiteShell>
      <PageHero
        eyebrow="Order online"
        heading="Menu"
        intro="Ajman originals, Italian classics, focaccia sandwiches, dessert pizzas, and drinks — all updated from the official Napoli 7 menu document."
      />
      <MenuLayout products={products} categories={categories} />
    </SiteShell>
  );
}
