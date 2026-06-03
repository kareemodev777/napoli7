"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useCart } from "@/store/cart";
import { formatAed } from "@/components/catalog/PriceBadge";
import { validatePromoCode } from "@/app/cart/actions";

export function CartSummary({ ctaHref = "/checkout" }: { ctaHref?: string }) {
  const subtotal = useCart((s) => s.subtotal());
  const itemCount = useCart((s) => s.totalQuantity());
  const promo = useCart((s) => s.promo);
  const discount = useCart((s) => s.discount());
  const total = useCart((s) => s.total());
  const setPromo = useCart((s) => s.setPromo);
  const clearPromo = useCart((s) => s.clearPromo);

  const [code, setCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleApply(e: React.FormEvent) {
    e.preventDefault();
    setPromoError(null);
    const entered = code.trim();
    if (!entered) {
      setPromoError("Enter a promo code.");
      return;
    }
    startTransition(async () => {
      const result = await validatePromoCode(entered, subtotal);
      if (result.error || !result.code || result.amount == null) {
        setPromoError(result.error ?? "That promo code isn't valid.");
        return;
      }
      setPromo({ code: result.code, amount: result.amount });
      setCode("");
    });
  }

  function handleRemove() {
    clearPromo();
    setPromoError(null);
  }

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
        <Row label="Delivery fee">Calculated at checkout</Row>
      </dl>

      {promo ? (
        <div className="mt-6 flex items-center justify-between gap-3 border border-border bg-background px-3 py-2.5">
          <span className="font-display text-xs tracking-[0.1em] uppercase">
            {promo.code} applied
          </span>
          <button
            type="button"
            onClick={handleRemove}
            className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleApply}
          className="mt-6 grid grid-cols-[1fr_auto] gap-2"
        >
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Promo code"
            aria-label="Promo code"
            aria-describedby={promoError ? "promo-error" : undefined}
            aria-invalid={promoError ? true : undefined}
            disabled={pending}
            className="border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase placeholder:text-muted-foreground focus:outline-none focus:border-brand disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="border border-foreground px-4 py-2.5 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background disabled:opacity-60"
          >
            {pending ? "…" : "Apply"}
          </button>
          {promoError ? (
            <p
              id="promo-error"
              role="status"
              className="col-span-2 text-xs text-muted-foreground mt-1"
            >
              {promoError}
            </p>
          ) : null}
        </form>
      )}

      <div className="mt-6 border-t border-border pt-4 flex items-baseline justify-between">
        <span className="font-display text-xs tracking-[0.25em] uppercase">
          Total
        </span>
        <span className="font-display text-xl tabular-nums">
          {formatAed(total)}
        </span>
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
