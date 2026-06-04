"use client";

import { useState } from "react";
import { ShoppingBag, Sliders } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Product, SizeId } from "@/data/types/catalog";
import { useCart } from "@/store/cart";
import { VegDot } from "./VegDot";
import { SpicyDot } from "./SpicyDot";
import { SizeSelector } from "./SizeSelector";
import { CustomizeModal } from "./CustomizeModal";
import { formatAed } from "./PriceBadge";

interface MenuProductCardProps {
  product: Product;
}

export function MenuProductCard({ product }: MenuProductCardProps) {
  const addItem = useCart((s) => s.addItem);
  const [sizeId, setSizeId] = useState<SizeId>(
    product.sizes[0]?.id ?? "regular",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const selectedSize =
    product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const hasCustomizations = product.customizations.length > 0;

  function handleQuickAdd() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameIt: product.nameIt,
      basePrice: selectedSize.price,
      unitPrice: selectedSize.price,
      quantity: 1,
      customizations: [],
      imageUrl: product.imageUrl,
      sizeId: selectedSize.id,
      sizeLabel: selectedSize.label,
      sizeDetail: selectedSize.detail,
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }

  return (
    <article className="group flex flex-col bg-background border border-border hover:border-foreground transition-colors">
      <div className="relative aspect-[1/1] overflow-hidden bg-muted sm:aspect-[4/3]">
        <SmartImage
          src={product.imageUrl}
          alt={`${product.name} from Napoli 7`}
          fill
          sizes="(min-width: 1280px) 28vw, (min-width: 768px) 45vw, 100vw"
          className="object-contain p-3 sm:p-4"
        />
        {(product.isVeg || product.isSpicy) && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {product.isVeg ? <VegDot /> : null}
            {product.isSpicy ? <SpicyDot /> : null}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div>
          <h3 className="font-display text-lg font-medium leading-tight">
            {product.name}
          </h3>
          {product.nameIt ? (
            <p className="text-sm italic text-muted-foreground mt-0.5">
              {product.nameIt}
            </p>
          ) : null}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {product.description}
        </p>

        {product.sizes.length > 1 ? (
          <div>
            <SizeSelector
              sizes={product.sizes}
              value={sizeId}
              onChange={setSizeId}
            />
          </div>
        ) : null}

        <div className="mt-2 flex items-center justify-between gap-3 pt-3 border-t border-border">
          <span className="font-display text-base tabular-nums">
            {formatAed(selectedSize.price)}
          </span>
          <div className="flex items-center gap-2">
            {hasCustomizations ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 border border-border h-10 px-3 font-display text-[11px] tracking-[0.2em] uppercase hover:border-foreground hover:bg-muted"
                aria-label={`Customize ${product.name}`}
              >
                <Sliders
                  className="h-3.5 w-3.5"
                  strokeWidth={1.5}
                  aria-hidden
                />
                Customize
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleQuickAdd}
              aria-label={`Add ${product.name} to cart`}
              className="h-10 w-10 inline-flex items-center justify-center bg-brand text-primary-foreground hover:bg-brand-hover relative"
            >
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              {justAdded ? (
                <span
                  role="status"
                  aria-live="polite"
                  className="absolute -top-2 right-full mr-2 whitespace-nowrap font-display text-[10px] tracking-[0.2em] uppercase bg-foreground text-background px-2 py-1"
                >
                  Added
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </div>

      {hasCustomizations && modalOpen ? (
        <CustomizeModal
          product={product}
          initialSize={sizeId}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </article>
  );
}
