"use client";

import { useState } from "react";
import { ShoppingCart, Sliders } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import type { Product, SizeId } from "@/data/types/catalog";
import { useCart } from "@/store/cart";
import { VegDot } from "./VegDot";
import { SpicyDot } from "./SpicyDot";
import { SizeSelector } from "./SizeSelector";
import { CustomizeModal } from "./CustomizeModal";
import { formatAed } from "./PriceBadge";
import { useOrderingAvailability } from "@/lib/use-ordering-availability";

interface MenuProductCardProps {
  product: Product;
}

export function MenuProductCard({ product }: MenuProductCardProps) {
  const addItem = useCart((s) => s.addItem);
  const { availability } = useOrderingAvailability();
  const orderingOpen = availability?.isOpen ?? true;
  const [sizeId, setSizeId] = useState<SizeId>(
    product.sizes[0]?.id ?? "regular",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const selectedSize =
    product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];
  const hasCustomizations = product.customizations.length > 0;
  const unavailable = Boolean(product.isTemporarilyUnavailable) || !orderingOpen;
  // Only what's actually on the pizza — the "Included on this pizza" ingredients
  // the customer can remove. Non-removable rows are add-ons (extra toppings you
  // can add), not ingredients, so they don't belong in this line. This mirrors the
  // "Extra ingredients" group in Customize, so the two can never disagree.
  const ingredients = product.customizations
    .filter((c) => c.removable)
    .map((c) => c.ingredient)
    .join(", ");

  function handleQuickAdd() {
    addItem({
      productId: product.id,
      categoryId: product.categoryId,
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
    <article
      className={
        "group flex flex-col bg-background border border-border transition-colors " +
        (unavailable ? "opacity-85" : "hover:border-foreground")
      }
    >
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
        {unavailable ? (
          <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-center px-3 py-2 font-display text-[10px] tracking-[0.2em] uppercase">
            Momentarily unavailable
          </div>
        ) : null}
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

        {/* What's actually on it, in full, before the customer has to open
            anything. It used to be the description clamped to two lines — and for
            a pizza the description IS the ingredient list, so the menu was
            truncating the one thing people choose a pizza by. Drinks and the like
            carry no ingredients, so they keep their description. */}
        {ingredients ? (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {ingredients}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground leading-relaxed flex-1">
            {product.description}
          </p>
        )}

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
                disabled={unavailable}
                className="inline-flex items-center gap-1.5 border border-border h-10 px-3 font-display text-[11px] tracking-[0.2em] uppercase hover:border-foreground hover:bg-muted disabled:opacity-50 disabled:hover:border-border disabled:hover:bg-transparent"
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
              disabled={unavailable}
              className="h-10 w-10 inline-flex items-center justify-center bg-brand text-primary-foreground hover:bg-brand-hover relative disabled:opacity-50 disabled:hover:bg-brand"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden />
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
