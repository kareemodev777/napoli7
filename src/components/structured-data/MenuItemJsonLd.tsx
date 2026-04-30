import type { Product } from "@/data/types/catalog";

export function MenuItemJsonLd({ product }: { product: Product }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: product.name,
    description: product.description,
    image: `https://napoli7.com${product.imageUrl}`,
    offers: {
      "@type": "Offer",
      price: product.price.toFixed(2),
      priceCurrency: "AED",
      availability: product.isActive
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
    suitableForDiet: product.isVeg ? "https://schema.org/VegetarianDiet" : undefined,
  };

  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {JSON.stringify(data)}
    </script>
  );
}
