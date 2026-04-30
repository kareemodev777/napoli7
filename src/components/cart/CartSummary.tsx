"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/store/cart";
import { formatAed } from "@/components/catalog/PriceBadge";

export function CartSummary({ ctaHref = "/checkout" }: { ctaHref?: string }) {
  const subtotal = useCart((s) => s.subtotal());
  const itemCount = useCart((s) => s.totalQuantity());
  const [promo, setPromo] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setPromoError("Promo codes available soon");
  }

  return (
    <aside className="border border-border bg-card p-6 lg:p-8 lg:sticky lg:top-6">
      <h2 className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-5">
        Order summary
      </h2>
      <dl className="space-y-3 text-sm">
        <Row label={`Subtotal (${itemCount} item${itemCount === 1 ? "" : "s"})`}>
          {formatAed(subtotal)}
        </Row>
        <Row label="Delivery fee">Calculated at checkout</Row>
      </dl>
      <form onSubmit={handleApply} className="mt-6 grid grid-cols-[1fr_auto] gap-2">
        <input
          type="text"
          value={promo}
          onChange={(e) => setPromo(e.target.value.toUpperCase())}
          placeholder="Promo code"
          aria-label="Promo code"
          className="border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase placeholder:text-muted-foreground focus:outline-none focus:border-brand"
        />
        <button
          type="submit"
          className="border border-foreground px-4 py-2.5 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
        >
          Apply
        </button>
        {promoError ? (
          <p
            role="status"
            className="col-span-2 text-xs text-muted-foreground mt-1"
          >
            {promoError}
          </p>
        ) : null}
      </form>
      <div className="mt-6 border-t border-border pt-4 flex items-baseline justify-between">
        <span className="font-display text-xs tracking-[0.25em] uppercase">Total</span>
        <span className="font-display text-xl tabular-nums">{formatAed(subtotal)}</span>
      </div>
      <Link
        href={ctaHref}
        className="mt-6 inline-flex w-full items-center justify-center bg-brand text-primary-foreground py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
      >
        Proceed to checkout
      </Link>
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
