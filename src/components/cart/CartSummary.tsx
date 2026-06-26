"use client";

import Link from "next/link";
import { useCart } from "@/store/cart";
import { formatAed } from "@/components/catalog/PriceBadge";
import { PromoField } from "@/components/cart/PromoField";
import { useOrderingAvailability } from "@/lib/use-ordering-availability";

export function CartSummary({ ctaHref = "/checkout" }: { ctaHref?: string }) {
  const subtotal = useCart((s) => s.subtotal());
  const itemCount = useCart((s) => s.totalQuantity());
  const promo = useCart((s) => s.promo);
  const discount = useCart((s) => s.discount());
  const total = useCart((s) => s.total());

  const { availability } = useOrderingAvailability();
  const orderingOpen = availability?.isOpen ?? true;

  return (
    <aside className="border border-border bg-card p-6 lg:p-8 lg:sticky lg:top-6">
      <h2 className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-5">
        Order summary
      </h2>
      <dl className="space-y-3 text-sm">
        <Row
          label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`}
        >
          {formatAed(subtotal)}
        </Row>
        {promo ? (
          <Row label={`Discount · ${promo.code}`}>
            <span>−{formatAed(discount)}</span>
          </Row>
        ) : null}
        <Row label="Delivery fee · 12 AED">At checkout</Row>
      </dl>

      <div className="mt-6">
        <PromoField />
      </div>

      <div className="mt-6 border-t border-border pt-4 flex items-baseline justify-between">
        <span className="font-display text-xs tracking-[0.25em] uppercase">
          Total
        </span>
        <span className="font-display text-xl tabular-nums">
          {formatAed(total)}
        </span>
      </div>
      {orderingOpen ? (
        <Link
          href={ctaHref}
          className="mt-6 inline-flex w-full items-center justify-center bg-brand text-primary-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
        >
          Proceed to checkout
        </Link>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            Ordering is paused right now. Check back when we reopen.
          </div>
          <Link
            href="/location"
            className="inline-flex w-full items-center justify-center border border-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
          >
            See opening hours
          </Link>
        </div>
      )}
    </aside>
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
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
