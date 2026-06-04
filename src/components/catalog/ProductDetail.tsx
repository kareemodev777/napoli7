"use client";

import { useMemo, useState } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import type {
  CartCustomization,
  CustomizationChoice,
  Product,
  SizeId,
} from "@/data/types/catalog";
import { useCart } from "@/store/cart";
import { Breadcrumb } from "./Breadcrumb";
import { CustomizationRow } from "./CustomizationRow";
import { QuantityStepper } from "./QuantityStepper";
import { SizeSelector } from "./SizeSelector";
import { PriceBadge, formatAed } from "./PriceBadge";
import { VegDot } from "./VegDot";
import { SpicyDot } from "./SpicyDot";

interface ProductDetailProps {
  product: Product;
  categoryLabel: string;
}

export function ProductDetail({ product, categoryLabel }: ProductDetailProps) {
  const addItem = useCart((s) => s.addItem);

  const [sizeId, setSizeId] = useState<SizeId>(
    product.sizes[0]?.id ?? "regular",
  );
  const [choices, setChoices] = useState<Record<string, CustomizationChoice>>(
    Object.fromEntries(
      product.customizations.map((c) => [c.ingredient, "default" as const]),
    ),
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const selectedSize =
    product.sizes.find((s) => s.id === sizeId) ?? product.sizes[0];

  const cartCustomizations = useMemo<CartCustomization[]>(() => {
    return product.customizations
      .filter(
        (c) => choices[c.ingredient] && choices[c.ingredient] !== "default",
      )
      .map((c) => ({
        ingredient: c.ingredient,
        choice: choices[c.ingredient],
        extraPrice: choices[c.ingredient] === "extra" ? (c.extraPrice ?? 0) : 0,
      }));
  }, [choices, product.customizations]);

  const unitPrice = useMemo(() => {
    const extras = cartCustomizations.reduce((sum, c) => sum + c.extraPrice, 0);
    return selectedSize.price + extras;
  }, [cartCustomizations, selectedSize.price]);

  const lineTotal = unitPrice * qty;

  function handleAdd() {
    addItem({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameIt: product.nameIt,
      basePrice: selectedSize.price,
      unitPrice,
      quantity: qty,
      customizations: cartCustomizations,
      imageUrl: product.imageUrl,
      sizeId: selectedSize.id,
      sizeLabel: selectedSize.label,
      sizeDetail: selectedSize.detail,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="px-6 md:px-10 py-10">
      <div className="max-w-[1140px] mx-auto">
        <Breadcrumb
          items={[
            { label: "Menu", href: "/menu" },
            { label: categoryLabel, href: `/menu#${product.categoryId}` },
            { label: product.name },
          ]}
        />
        <div className="mt-10 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-16 items-start">
          <div className="relative aspect-[1/1] sm:aspect-[4/3] bg-muted overflow-hidden rounded-md">
            <SmartImage
              src={product.imageUrl}
              alt={`${product.name} from Napoli 7`}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-contain p-3 sm:p-5"
              overlayClassName="rounded-md"
            />
          </div>
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-3">
              {categoryLabel}
            </p>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl uppercase tracking-[1.5px] leading-tight">
              {product.name}
            </h1>
            {product.nameIt ? (
              <p className="mt-2 italic text-lg text-muted-foreground">
                {product.nameIt}
              </p>
            ) : null}
            <div className="mt-3 flex items-center gap-2">
              {product.isVeg ? <VegDot /> : null}
              {product.isSpicy ? <SpicyDot /> : null}
            </div>

            <div className="mt-6">
              <PriceBadge amount={selectedSize.price} size="lg" />
            </div>

            <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-[55ch]">
              {product.description}
            </p>

            {product.sizes.length > 1 ? (
              <div className="mt-8">
                <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  Size
                </p>
                <SizeSelector
                  sizes={product.sizes}
                  value={sizeId}
                  onChange={setSizeId}
                  size="md"
                />
              </div>
            ) : null}

            {product.customizations.length > 0 ? (
              <div className="mt-10">
                <p className="font-display text-xs tracking-[0.25em] uppercase text-foreground mb-4">
                  Customize
                </p>
                <div className="border-b border-border">
                  {product.customizations
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((c) => (
                      <CustomizationRow
                        key={c.ingredient}
                        customization={c}
                        value={choices[c.ingredient] ?? "default"}
                        onChange={(next) =>
                          setChoices((prev) => ({
                            ...prev,
                            [c.ingredient]: next,
                          }))
                        }
                      />
                    ))}
                </div>
              </div>
            ) : null}

            <div className="mt-10 grid sm:grid-cols-[auto_1fr] items-center gap-4">
              <QuantityStepper value={qty} onChange={setQty} size="lg" />
              <button
                type="button"
                onClick={handleAdd}
                aria-live="polite"
                className="w-full inline-flex items-center justify-center bg-brand text-primary-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
              >
                {added ? "Added" : `Add to cart · ${formatAed(lineTotal)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
