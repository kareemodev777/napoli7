"use client";

import { useState } from "react";
import type { Category, Product } from "@/data/types/catalog";
import { ProductCard } from "./ProductCard";
import { CategoryTabs } from "./CategoryTabs";

type Filter = "all" | Category["id"];

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  initialFilter?: Filter;
}

export function ProductGrid({
  products,
  categories,
  initialFilter = "all",
}: ProductGridProps) {
  const [filter, setFilter] = useState<Filter>(initialFilter);

  const filtered =
    filter === "all"
      ? products
      : products.filter((p) => p.categoryId === filter);

  const activeCategory =
    filter === "all" ? null : categories.find((c) => c.id === filter);

  return (
    <div>
      <CategoryTabs
        categories={categories}
        active={filter}
        onChange={setFilter}
      />
      {activeCategory ? (
        <p className="mt-6 text-sm md:text-base text-muted-foreground max-w-[60ch] leading-relaxed">
          {activeCategory.description}
        </p>
      ) : null}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-background p-16 text-center text-muted-foreground">
            No items in this category yet.
          </div>
        ) : (
          filtered.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>
    </div>
  );
}
