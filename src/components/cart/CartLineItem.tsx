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

  return (
    <li className="grid grid-cols-[100px_1fr_auto] sm:grid-cols-[120px_1fr_auto] gap-5 border-b border-border py-6">
      <Link
        href={`/menu/${item.slug}`}
        className="relative aspect-[4/3] bg-muted overflow-hidden block"
        aria-label={`${item.name} — view product`}
      >
        <SmartImage
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="120px"
          className="object-contain p-2"
        />
      </Link>
      <div className="min-w-0">
        <Link
          href={`/menu/${item.slug}`}
          className="font-display text-base md:text-lg font-medium hover:text-brand"
        >
          {item.name}
        </Link>
        {item.nameIt ? (
          <p className="text-xs italic text-muted-foreground">{item.nameIt}</p>
        ) : null}
        {customSummary ? (
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {customSummary}
          </p>
        ) : null}
        <div className="mt-3 flex items-center gap-4">
          <QuantityStepper
            value={item.quantity}
            onChange={(q) => updateQuantity(item.id, q)}
          />
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            aria-label={`Remove ${item.name} from cart`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Remove
          </button>
        </div>
      </div>
      <div className="text-right">
        <PriceBadge amount={item.unitPrice * item.quantity} size="md" />
      </div>
    </li>
  );
}
