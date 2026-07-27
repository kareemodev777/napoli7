import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { MenuLayout } from "@/components/catalog/MenuLayout";
import { getActiveProducts, getCatalogCategories } from "@/lib/catalog";

// Short window so an owner's price edit shows on the storefront within a minute
// even if on-demand revalidation (revalidatePath in the catalog actions) does
// not reach this deployment. The menu is small, so regenerating it is cheap.
export const revalidate = 60;

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
