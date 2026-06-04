"use client";

import { useMemo, useState } from "react";
import { SmartImage } from "@/components/ui/SmartImage";
import { Plus, Minus, X, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useCart } from "@/store/cart";
import { formatAed } from "./PriceBadge";
import { SizeSelector } from "./SizeSelector";
import { VegDot } from "./VegDot";
import { SpicyDot } from "./SpicyDot";
import type {
  CartCustomization,
  CustomizationChoice,
  Product,
  ProductSize,
  SizeId,
} from "@/data/types/catalog";

interface CustomizeModalProps {
  product: Product;
  initialSize: SizeId;
  onClose: () => void;
}

// The modal is rendered only when the parent decides it should be open.
// That means each "open" mounts a fresh component with fresh state — no
// useEffect-driven resets needed.
export function CustomizeModal({
  product,
  initialSize,
  onClose,
}: CustomizeModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="!max-w-3xl p-0 gap-0 border border-border bg-background sm:rounded-none rounded-none overflow-hidden"
      >
        <CustomizeForm
          product={product}
          initialSize={initialSize}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}

interface FormProps {
  product: Product;
  initialSize: SizeId;
  onClose: () => void;
}

function CustomizeForm({ product, initialSize, onClose }: FormProps) {
  const addItem = useCart((s) => s.addItem);

  const [selectedSizeId, setSelectedSizeId] = useState<SizeId>(initialSize);
  const [choices, setChoices] = useState<Record<string, CustomizationChoice>>(
    () =>
      Object.fromEntries(
        product.customizations.map((c) => [c.ingredient, "default" as const]),
      ),
  );
  const [qty, setQty] = useState(1);

  const selectedSize: ProductSize =
    product.sizes.find((s) => s.id === selectedSizeId) ?? product.sizes[0];

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

  function setChoice(ingredient: string, choice: CustomizationChoice) {
    setChoices((prev) => {
      const next = { ...prev };
      if (next[ingredient] === choice) {
        next[ingredient] = "default";
      } else {
        next[ingredient] = choice;
      }
      return next;
    });
  }

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
    onClose();
  }

  return (
    <>
      <header className="flex items-start justify-between gap-4 px-6 md:px-10 pt-8 pb-5 border-b border-border">
        <div>
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-azure-deep mb-2">
            Customize
          </p>
          <DialogTitle className="font-display text-2xl md:text-3xl uppercase tracking-[1.5px] leading-tight">
            {product.name}
          </DialogTitle>
          {product.nameIt ? (
            <DialogDescription className="mt-1 italic text-sm text-muted-foreground">
              {product.nameIt}
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">
              Choose ingredients for {product.name}
            </DialogDescription>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="h-10 w-10 inline-flex items-center justify-center border border-border hover:bg-muted"
        >
          <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </header>

      <div className="grid md:grid-cols-[1.1fr_1fr] max-h-[70vh] md:max-h-[65vh] overflow-hidden">
        <div className="overflow-y-auto px-6 md:px-10 py-6 border-b md:border-b-0 md:border-r border-border">
          {product.sizes.length > 1 ? (
            <div className="mb-6">
              <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                Size
              </p>
              <SizeSelector
                sizes={product.sizes}
                value={selectedSizeId}
                onChange={setSelectedSizeId}
                size="md"
              />
            </div>
          ) : null}

          {product.customizations.length === 0 ? (
            <p className="text-sm text-muted-foreground leading-relaxed py-4">
              No customizations available for this item.
            </p>
          ) : (
            <>
              <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-3">
                Ingredients
              </p>
              <ul className="border-t border-border">
                {product.customizations
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((c) => {
                    const value = choices[c.ingredient] ?? "default";
                    return (
                      <li
                        key={c.ingredient}
                        className="grid grid-cols-[1fr_auto] gap-3 items-center py-3 border-b border-border"
                      >
                        <div>
                          <p className="font-display text-sm font-medium">
                            {c.ingredient}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {value === "default"
                              ? "Included"
                              : value === "extra"
                                ? `Extra +${formatAed(c.extraPrice ?? 0)}`
                                : "Removed"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {c.removable ? (
                            <ToggleButton
                              active={value === "without"}
                              onClick={() => setChoice(c.ingredient, "without")}
                              ariaLabel={`Remove ${c.ingredient}`}
                            >
                              <Minus
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                            </ToggleButton>
                          ) : null}
                          {c.extraPrice !== null ? (
                            <ToggleButton
                              active={value === "extra"}
                              onClick={() => setChoice(c.ingredient, "extra")}
                              ariaLabel={`Add extra ${c.ingredient}`}
                            >
                              <Plus
                                className="h-3.5 w-3.5"
                                strokeWidth={1.5}
                                aria-hidden
                              />
                            </ToggleButton>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}
        </div>

        <aside className="overflow-y-auto px-6 md:px-10 py-6 bg-muted/40">
          <div className="relative aspect-[4/3] bg-muted overflow-hidden">
            <SmartImage
              src={product.imageUrl}
              alt={`${product.name} from Napoli 7`}
              fill
              sizes="(min-width: 768px) 360px, 90vw"
              className="object-contain p-4"
            />
            {(product.isVeg || product.isSpicy) && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {product.isVeg ? <VegDot /> : null}
                {product.isSpicy ? <SpicyDot /> : null}
              </div>
            )}
          </div>

          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          <div className="mt-6 border-t border-border pt-4 space-y-3 text-sm">
            <Row label="Size">
              {selectedSize.label}
              {selectedSize.detail ? (
                <span className="text-muted-foreground">
                  {" "}
                  · {selectedSize.detail}
                </span>
              ) : null}
            </Row>
            <Row label="Base">{formatAed(selectedSize.price)}</Row>
            {cartCustomizations.length > 0 ? (
              <div>
                <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">
                  Customizations
                </p>
                <ul className="space-y-1 text-xs">
                  {cartCustomizations.map((c) => (
                    <li
                      key={c.ingredient}
                      className="flex justify-between gap-3"
                    >
                      <span>
                        {c.choice === "extra" ? "Extra" : "Without"}{" "}
                        {c.ingredient}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.extraPrice ? `+${formatAed(c.extraPrice)}` : "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
              Quantity
            </span>
            <div className="inline-flex items-center border border-border bg-background">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-10 w-10 inline-flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>
              <span
                aria-live="polite"
                className="min-w-10 text-center font-display tabular-nums"
              >
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={qty >= 20}
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                className="h-10 w-10 inline-flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
              </button>
            </div>
          </div>
        </aside>
      </div>

      <footer className="grid grid-cols-[1fr_auto] items-center gap-4 border-t border-border px-6 md:px-10 py-5 bg-background">
        <div>
          <p className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
            Total
          </p>
          <p className="font-display text-xl tabular-nums">
            {formatAed(lineTotal)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 bg-brand text-primary-foreground px-6 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
        >
          Add to cart
          <ShoppingBag className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </button>
      </footer>
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  ariaLabel,
  children,
}: {
  active: boolean;
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={
        "h-9 w-9 inline-flex items-center justify-center border " +
        (active
          ? "bg-foreground text-background border-foreground"
          : "border-border hover:bg-muted text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-display text-[10px] tracking-[0.25em] uppercase text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}
