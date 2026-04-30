"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import type { Category, Product } from "@/data/types/catalog";
import { MenuProductCard } from "./MenuProductCard";
import { MenuCategoryNav } from "./MenuCategoryNav";
import { CartSidebar } from "@/components/cart/CartSidebar";
import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { formatAed } from "./PriceBadge";

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
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] gap-10 px-6 md:px-10 pt-6 pb-16 max-w-[1500px] mx-auto">
      <div>
        <MenuCategoryNav categories={categories.filter((c) => grouped.has(c.id))} />

        <div className="space-y-16 md:space-y-20">
          {categories.map((c) => {
            const items = grouped.get(c.id);
            if (!items) return null;
            return (
              <section
                key={c.id}
                id={c.id}
                aria-labelledby={`${c.id}-heading`}
                className="scroll-mt-24"
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

      <MobileCartDrawer />
    </div>
  );
}

function MobileCartDrawer() {
  const totalQty = useCart((s) => s.totalQuantity());
  const subtotal = useCart((s) => s.subtotal());
  const mounted = useMounted();
  const [open, setOpen] = useState(false);

  if (!mounted || totalQty === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-3 bg-brand text-primary-foreground px-5 py-3.5 font-display text-xs tracking-[0.2em] uppercase shadow-lg hover:bg-brand-hover"
      >
        <ShoppingBag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        <span>
          {totalQty} item{totalQty === 1 ? "" : "s"}
        </span>
        <span className="tabular-nums">{formatAed(subtotal)}</span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Shopping cart"
          aria-modal="true"
          className="lg:hidden fixed inset-0 z-50 flex"
        >
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative ml-auto w-full max-w-md bg-background border-l border-border flex flex-col">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close cart"
              className="absolute top-4 right-4 z-10 h-9 w-9 inline-flex items-center justify-center border border-border bg-background hover:bg-muted"
            >
              <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </button>
            <div className="overflow-y-auto p-2 h-full">
              <CartSidebar />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
