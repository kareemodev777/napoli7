"use client";

import { useMenuDiscount } from "@/components/pricing/MenuDiscountProvider";
import { discountedPriceAed } from "@/lib/menu-discount";
import { formatAed } from "@/components/catalog/PriceBadge";

/**
 * A price that reflects the active site-wide sale (e.g. Grand Opening – 50% OFF):
 * the discounted amount, with the original struck through beside it. When no sale
 * is live it renders the plain price, so callers can use it anywhere a price shows
 * without branching on the sale themselves.
 */
export function SalePrice({
  amount,
  className = "",
  originalClassName = "",
}: {
  amount: number;
  /** Applied to the (discounted) price shown to the customer. */
  className?: string;
  /** Applied to the struck-through original price. */
  originalClassName?: string;
}) {
  const sale = useMenuDiscount();

  if (!sale.active) {
    return <span className={`tabular-nums ${className}`}>{formatAed(amount)}</span>;
  }

  return (
    <span className="inline-flex items-baseline gap-2">
      <span className={`tabular-nums text-brand ${className}`}>
        {formatAed(discountedPriceAed(amount, sale))}
      </span>
      <span
        className={`tabular-nums text-muted-foreground line-through text-[0.8em] font-normal ${originalClassName}`}
      >
        {formatAed(amount)}
      </span>
    </span>
  );
}
