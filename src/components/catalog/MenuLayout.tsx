"use client";

import { useMemo } from "react";
import type { Category, Product } from "@/data/types/catalog";
import { MenuProductCard } from "./MenuProductCard";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { CartSidebar } from "@/components/cart/CartSidebar";

interface MenuLayoutProps {
  products: Product[];
  categories: Category[];
}

export function MenuLayout({ products, categories }: MenuLayoutProps) {
  const grouped = useMemo(() => {
    const result = new Map<string, Product[]>();
    categories.forEach((c) => {
      const items = products
        .filter((p) => p.categoryId === c.id)
        .sort((a, b) => a.position - b.position);
      if (items.length > 0) result.set(c.id, items);
    });
    return result;
  }, [products, categories]);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-10 px-6 md:px-10 pt-6 pb-24 lg:pb-16 max-w-[1500px] mx-auto">
      <div>
        <MenuCategoryNav
          categories={categories.filter((c) => grouped.has(c.id))}
        />

        <div className="space-y-16 md:space-y-20">
          {categories.map((c) => {
            const items = grouped.get(c.id);
            if (!items) return null;
            return (
              <section
                key={c.id}
                id={c.id}
                aria-labelledby={`${c.id}-heading`}
                className="scroll-mt-[calc(var(--header-h)+50px)]"
              >
                <header className="flex items-baseline justify-between flex-wrap gap-3 mb-6 md:mb-8 pb-4 border-b border-border">
                  <div>
                    <p className="font-display text-[10px] tracking-[0.25em] uppercase text-azure-deep mb-2">
                      {String(items.length).padStart(2, "0")} items
                    </p>
                    <h2
                      id={`${c.id}-heading`}
                      className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight"
                    >
                      {c.label}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-[42ch] leading-relaxed">
                    {c.description}
                  </p>
                </header>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 md:gap-6">
                  {items.map((p) => (
                    <MenuProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block">
        <CartSidebar />
      </div>
    </div>
  );
}
