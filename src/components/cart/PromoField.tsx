"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useCart } from "@/store/cart";
import { validatePromoCode } from "@/app/cart/actions";

/**
 * Promo-code apply/remove control, shared by the cart summary and the checkout
 * summary. Deliberately form-LESS (a div, not a <form>, with a type="button"
 * apply and an Enter handler) so it can live inside the checkout's own <form>
 * without nesting forms or submitting the order on Enter.
 *
 * The discount shown here is advisory only — the order action re-validates the
 * code and recomputes the amount server-side, so a tampered client value can
 * never grant an unearned discount.
 */
export function PromoField({
  autoApplyCode,
}: {
  /** A code (e.g. the customer's signup reward) to apply automatically once, so
   *  they don't have to remember or re-type it. */
  autoApplyCode?: string | null;
} = {}) {
  const subtotal = useCart((s) => s.subtotal());
  const promo = useCart((s) => s.promo);
  const setPromo = useCart((s) => s.setPromo);
  const clearPromo = useCart((s) => s.clearPromo);

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A promo persists in localStorage (Zustand persist), so it can outlive its
  // validity — the code may have been used, expired, removed, or no longer met
  // (e.g. the DB was reset). Re-check a persisted promo once the cart has a
  // subtotal and drop it if it's no longer valid, so a phantom "applied" chip
  // and discount never linger.
  const checkedCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!promo || subtotal <= 0) return;
    if (checkedCodeRef.current === promo.code) return;
    checkedCodeRef.current = promo.code;
    let cancelled = false;
    validatePromoCode(promo.code, subtotal)
      .then((result) => {
        if (cancelled) return;
        if (result.error || !result.code || result.amount == null) {
          clearPromo();
        } else if (
          result.amount !== promo.amount ||
          Boolean(result.isReward) !== Boolean(promo.isReward)
        ) {
          setPromo({
            code: result.code,
            amount: result.amount,
            isReward: result.isReward,
          });
        }
      })
      .catch(() => {
        // Transient failure — allow a retry instead of dropping a valid promo.
        checkedCodeRef.current = null;
      });
    return () => {
      cancelled = true;
    };
  }, [promo, subtotal, clearPromo, setPromo]);

  // Auto-apply the customer's own code (e.g. their signup reward) once the cart
  // has a subtotal — but only if no promo is applied yet, and only one attempt,
  // so removing it (or an invalid code) doesn't re-trigger. Silent on failure:
  // an auto-apply that doesn't fit (e.g. pickup-only on a delivery cart) simply
  // leaves the field empty rather than showing an error the customer didn't ask
  // for.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (!autoApplyCode || promo || subtotal <= 0 || autoAppliedRef.current) {
      return;
    }
    autoAppliedRef.current = true;
    let cancelled = false;
    validatePromoCode(autoApplyCode, subtotal)
      .then((result) => {
        if (cancelled || result.error || !result.code || result.amount == null) {
          return;
        }
        setPromo({
          code: result.code,
          amount: result.amount,
          isReward: result.isReward,
        });
      })
      .catch(() => {
        // Transient failure — allow one more attempt on a later render.
        autoAppliedRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [autoApplyCode, promo, subtotal, setPromo]);

  function apply() {
    setError(null);
    const entered = code.trim();
    if (!entered) {
      setError("Enter a promo code.");
      return;
    }
    startTransition(async () => {
      const result = await validatePromoCode(entered, subtotal);
      if (result.error || !result.code || result.amount == null) {
        setError(result.error ?? "That promo code isn't valid.");
        return;
      }
      setPromo({
        code: result.code,
        amount: result.amount,
        isReward: result.isReward,
      });
      setCode("");
    });
  }

  if (promo) {
    return (
      <div className="flex items-center justify-between gap-3 border border-border bg-background px-3 py-2.5">
        <span className="font-display text-xs tracking-[0.1em] uppercase">
          {promo.code} applied
        </span>
        <button
          type="button"
          onClick={() => {
            clearPromo();
            setError(null);
          }}
          className="font-display text-[11px] tracking-[0.2em] uppercase text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          // Apply on Enter without submitting any surrounding form.
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        placeholder="Promo code"
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
  );
}
