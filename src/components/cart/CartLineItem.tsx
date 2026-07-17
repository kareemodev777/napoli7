"use client";

import Link from "next/link";
import { Trash2 } from "lucide-react";
import { SmartImage } from "@/components/ui/SmartImage";
import { useCart } from "@/store/cart";
import type { CartItem } from "@/store/cart";
import { QuantityStepper } from "@/components/catalog/QuantityStepper";
import { PriceBadge } from "@/components/catalog/PriceBadge";

export function CartLineItem({ item }: { item: CartItem }) {
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);

  const customSummary = item.customizations
    .map((c) => {
      const action =
        c.choice === "extra"
          ? "Extra"
          : c.choice === "without"
            ? "Without"
            : "";
      return `${action} ${c.ingredient}${c.extraPrice ? ` (+${c.extraPrice.toFixed(2)} AED)` : ""}`.trim();
    })
    .join(" · ");

  // A flex row (image + a flexible column) rather than a fixed 3-column grid.
  // In the narrow cart drawer the old grid squeezed the middle column until the
  // quantity stepper (~176px) overflowed and overlapped, pushing the remove
  // control out of reach. Here the quantity + remove get their own full-width row
  // under the name, so they always fit whatever the drawer's width.
  return (
    <li className="flex gap-4 border-b border-border py-5">
      <Link
        href={`/menu/${item.slug}`}
        className="relative aspect-square w-16 sm:w-24 shrink-0 overflow-hidden rounded-md bg-white block"
        aria-label={`${item.name} — view product`}
      >
        <SmartImage
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="96px"
          className="object-contain p-2"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        {/* Title on the left, remove at the top-right corner — the place people
            look for it — so it never has to compete with the quantity stepper. */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/menu/${item.slug}`}
              className="font-display text-base font-medium leading-tight hover:text-brand"
            >
              {item.name}
            </Link>
            {item.nameIt ? (
              <p className="text-xs italic text-muted-foreground">
                {item.nameIt}
              </p>
            ) : null}
            {customSummary ? (
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {customSummary}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.name} from cart`}
            className="-mr-1.5 -mt-1.5 shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        {/* Quantity on the left, line total on the right. flex-wrap is a safety
            net for ultra-narrow screens — it never overlaps or clips. */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <QuantityStepper
            size="sm"
            value={item.quantity}
            onChange={(q) => updateQuantity(item.id, q)}
          />
          <PriceBadge amount={item.unitPrice * item.quantity} size="md" />
        </div>
      </div>
    </li>
  );
}
