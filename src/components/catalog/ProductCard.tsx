import Link from "next/link";
import type { Product } from "@/data/types/catalog";
import { SmartImage } from "@/components/ui/SmartImage";
import { VegDot } from "./VegDot";
import { SpicyDot } from "./SpicyDot";
import { PriceBadge } from "./PriceBadge";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group flex flex-col bg-card border border-border hover:shadow-sm transition-shadow">
      <Link
        href={`/menu/${product.slug}`}
        className="relative block aspect-[1/1] overflow-hidden bg-muted sm:aspect-[4/3]"
        aria-label={`${product.name} — view product`}
      >
        <SmartImage
          src={product.imageUrl}
          alt={`${product.name} from Napoli 7`}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-contain p-3 sm:p-4"
        />
        {(product.isVeg || product.isSpicy) && (
          <div className="absolute top-3 right-3 flex items-center gap-2">
            {product.isVeg ? <VegDot /> : null}
            {product.isSpicy ? <SpicyDot /> : null}
          </div>
        )}
      </Link>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-lg font-medium leading-tight">
            <Link href={`/menu/${product.slug}`} className="hover:text-brand">
              {product.name}
            </Link>
          </h3>
          <PriceBadge amount={product.price} size="md" />
        </div>
        {product.nameIt ? (
          <p className="text-sm italic text-muted-foreground -mt-2">
            {product.nameIt}
          </p>
        ) : null}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {product.description}
        </p>
        <Link
          href={`/menu/${product.slug}`}
          className="mt-2 inline-flex items-center justify-center bg-brand text-primary-foreground py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-brand-hover"
        >
          Add
        </Link>
      </div>
    </article>
  );
}
