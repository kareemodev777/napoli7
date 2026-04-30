import type { Product } from "@/data/types/catalog";
import { ProductCard } from "./ProductCard";

export function RelatedProducts({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="border-t border-border py-16 md:py-24 px-6 md:px-10">
      <div className="max-w-[1140px] mx-auto">
        <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[1.5px] mb-10">
          You might also like
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  );
}
