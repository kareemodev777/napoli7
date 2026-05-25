import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { MobileBottomBar } from "@/components/site/MobileBottomBar";
import { PageHero } from "@/components/site/PageHero";
import { MenuLayout } from "@/components/catalog/MenuLayout";
import { getActiveProducts, getCatalogCategories } from "@/lib/catalog";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Browse the Napoli 7 menu — seven Neapolitan pizzas, five focaccia sandwiches, three dessert pizzas, and eight cold drinks.",
  alternates: { canonical: "/menu" },
  openGraph: {
    title: "Menu · Napoli 7",
    description:
      "Seven pizzas, five focaccia, three desserts, eight drinks. Order online.",
  },
};

export default async function MenuPage() {
  const [products, categories] = await Promise.all([
    getActiveProducts(),
    getCatalogCategories(),
  ]);
  return (
    <>
      <Header />
      <main id="main" className="flex-1 bg-background text-foreground">
        <PageHero
          eyebrow="Order online"
          heading="Menu"
          intro="Seven pizzas. Five focaccia sandwiches. Three dessert pizzas. Eight drinks. Each one prepared on the same dough, in the same oven, every day."
        />
        <MenuLayout products={products} categories={categories} />
      </main>
      <Footer />
      <MobileBottomBar />
    </>
  );
}
