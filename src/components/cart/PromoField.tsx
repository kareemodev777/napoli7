"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useCart } from "@/store/cart";
import { validatePromoCode } from "@/app/cart/actions";

/**
 * Promo-code control, shared by the cart summary and the checkout summary.
 * Deliberately form-LESS (a div, not a <form>, with a type="button" apply and an
 * Enter handler) so it can live inside the checkout's own <form> without nesting
 * forms or submitting the order on Enter.
 *
 * SEVERAL codes can be applied to one order — three friends can pool their
 * free-pizza rewards on a single basket, and each takes 19 AED off. So this keeps
 * a list, and the field stays open after a code is added instead of collapsing
 * into a single "applied" chip.
 *
 * Everything shown here is advisory. The order action re-validates every code and
 * recomputes the discount server-side, so a tampered client value can never grant
 * an unearned discount.
 */
export function PromoField({
  autoApplyCode,
}: {
  /** A code (e.g. the customer's signup reward) to apply automatically once, so
   *  they don't have to remember or re-type it. */
  autoApplyCode?: string | null;
} = {}) {
  const subtotal = useCart((s) => s.subtotal());
  const promos = useCart((s) => s.promos);
  const addPromo = useCart((s) => s.addPromo);
  const removePromo = useCart((s) => s.removePromo);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Promos persist in localStorage, so one can outlive its validity — used,
  // expired, or wiped with the database. Re-check each persisted code once the
  // cart has a subtotal and drop any that no longer holds, so a phantom discount
  // never lingers.
  const checkedRef = useRef(new Set<string>());
  useEffect(() => {
    if (subtotal <= 0) return;
    let cancelled = false;
    for (const promo of promos) {
      if (checkedRef.current.has(promo.code)) continue;
      checkedRef.current.add(promo.code);
      validatePromoCode(promo.code, subtotal)
        .then((result) => {
          if (cancelled) return;
          if (result.error || !result.code || result.amount == null) {
            removePromo(promo.code);
          }
        })
        .catch(() => {
          // Transient failure — allow a retry rather than dropping a valid code.
          checkedRef.current.delete(promo.code);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [promos, subtotal, removePromo]);

  // Auto-apply the customer's own reward once, so they don't have to type it.
  // Silent on failure: a code that doesn't fit just leaves the field alone rather
  // than showing an error nobody asked for.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (!autoApplyCode || subtotal <= 0 || autoAppliedRef.current) return;
    if (promos.some((p) => p.code === autoApplyCode.toUpperCase())) return;
    autoAppliedRef.current = true;
    let cancelled = false;
    validatePromoCode(autoApplyCode, subtotal)
      .then((result) => {
        if (cancelled || result.error || !result.code || result.amount == null) {
          return;
        }
        addPromo({
          code: result.code,
          amount: result.amount,
          isReward: result.isReward,
        });
      })
      .catch(() => {
        autoAppliedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [autoApplyCode, promos, subtotal, addPromo]);

  function apply() {
    setError(null);
    const entered = code.trim().toUpperCase();
    if (!entered) {
      setError("Enter a promo code.");
      return;
    }
    // A code is worth 19 AED once. Applying it twice must not double the discount.
    if (promos.some((p) => p.code === entered)) {
      setError("That code is already on this order.");
      return;
    }
    startTransition(async () => {
      const result = await validatePromoCode(entered, subtotal);
      if (result.error || !result.code || result.amount == null) {
        setError(result.error ?? "That promo code isn't valid.");
        return;
      }
      addPromo({
        code: result.code,
        amount: result.amount,
        isReward: result.isReward,
      });
      setCode("");
    });
  }

  return (
    <div className="space-y-2">
      {promos.length > 0 ? (
        <ul className="space-y-2">
          {promos.map((promo) => (
            <li
              key={promo.code}
              className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2.5"
            >
              <span className="font-display text-xs tracking-[0.1em] uppercase">
                {promo.code} · −{promo.amount.toFixed(2)} AED
              </span>
              <button
                type="button"
                onClick={() => {
                  removePromo(promo.code);
                  setError(null);
                }}
                className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder={promos.length ? "Add another code" : "Promo code"}
          aria-label="Promo code"
          aria-describedby={error ? "promo-error" : undefined}
          aria-invalid={error ? true : undefined}
          disabled={pending}
          className="border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.1em] uppercase placeholder:text-muted-foreground focus:outline-none focus:border-brand disabled:opacity-60"
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          aria-busy={pending}
          className="border border-foreground px-4 py-2.5 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background disabled:opacity-60"
        >
          {pending ? "…" : "Apply"}
        </button>
        {error ? (
          <p
            id="promo-error"
            role="status"
            className="col-span-2 text-xs text-muted-foreground mt-1"
          >
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
