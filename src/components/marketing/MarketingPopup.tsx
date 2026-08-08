"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/store/cart";
import { validatePromoCode } from "@/app/cart/actions";
import { popupSignature, type MarketingPopup as PopupConfig } from "@/lib/marketing-popup";

const SEEN_PREFIX = "n7-popup:";

/**
 * The admin-configurable storefront popup. Opens exactly once per browser
 * session (immediately or after `delaySeconds`), showing the configured image +
 * message and a call-to-action: a link, a copy-code button, or a redeem-to-cart
 * button.
 *
 * Once shown it stays gone for the rest of the session — closing it any way at
 * all counts, and navigating between pages never brings it back. It returns in a
 * new session, or sooner if the admin edits its content (the session key is a
 * signature of that content, so a reworded popup reaches people who already
 * dismissed the old one).
 */
export function MarketingPopup({ config }: { config: PopupConfig }) {
  const router = useRouter();
  const subtotal = useCart((s) => s.subtotal());
  const addPromo = useCart((s) => s.addPromo);

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, startRedeem] = useTransition();

  const signature = popupSignature(config);

  // Open once per session after the configured delay, unless already seen.
  useEffect(() => {
    if (!config.enabled) return;
    const key = `${SEEN_PREFIX}${signature}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage unavailable (private mode) — just show it this once.
    }
    const timer = window.setTimeout(() => {
      // Claim the session slot at the moment it OPENS, not when the customer
      // engages with it. Being shown is the once-per-session event, however the
      // customer then gets rid of it — the X, a click outside, Escape, or a
      // button. Previously only "Order now"/"Maybe later" counted as handled,
      // so anyone who closed it the obvious way met it again on every single
      // page they visited for the rest of their session.
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        /* ignore */
      }
      setOpen(true);
    }, Math.max(0, config.delaySeconds) * 1000);
    return () => window.clearTimeout(timer);
  }, [config.enabled, config.delaySeconds, signature]);

  if (!config.enabled) return null;

  // Belt and braces: opening already claimed the session slot, so this is a
  // no-op in the normal case. It matters only if that first write failed —
  // Safari, for one, can throw on storage early in a page's life and succeed
  // moments later.
  function markHandled() {
    try {
      sessionStorage.setItem(`${SEEN_PREFIX}${signature}`, "1");
    } catch {
      /* ignore */
    }
  }

  function dismiss() {
    markHandled();
    setOpen(false);
  }

  async function copyCode() {
    setError(null);
    try {
      await navigator.clipboard.writeText(config.ctaCode);
      setCopied(true);
      markHandled();
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — the code is " + config.ctaCode);
    }
  }

  function redeem() {
    setError(null);
    if (subtotal <= 0) {
      setError("Add something to your cart first — the code applies at checkout.");
      return;
    }
    startRedeem(async () => {
      const result = await validatePromoCode(config.ctaCode, subtotal);
      if (result.error || !result.code || result.amount == null) {
        setError(result.error ?? "That code isn't valid right now.");
        return;
      }
      addPromo({
        code: result.code,
        amount: result.amount,
        isReward: result.isReward,
      });
      markHandled();
      setOpen(false);
      router.push("/checkout");
    });
  }

  const hasImage = Boolean(config.imageUrl);
  const hasText = Boolean(config.title || config.body);
  const hasCta = config.ctaType !== "none";

  const primaryLabel =
    config.ctaType === "copy"
      ? copied
        ? "Copied ✓"
        : config.ctaLabel || `Copy ${config.ctaCode}`
      : config.ctaType === "redeem"
        ? redeeming
          ? "Applying…"
          : config.ctaLabel || "Redeem now"
        : config.ctaLabel || "Order now";

  const primaryCls =
    "w-full rounded-lg bg-brand py-3.5 font-display text-sm uppercase tracking-[0.2em] text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-60";

  // Side-by-side (image | content) on desktop when there's both an image and
  // something to say; a single centred column otherwise. Stacks on mobile.
  const sideBySide = hasImage && (hasText || hasCta);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className={
          "max-h-[90vh] max-w-[calc(100%-2rem)] gap-0 overflow-y-auto p-0 " +
          (sideBySide ? "sm:max-w-lg md:max-w-3xl" : "sm:max-w-md")
        }
      >
        <DialogTitle className="sr-only">
          {config.title || "Napoli 7 announcement"}
        </DialogTitle>

        <div className={sideBySide ? "grid md:grid-cols-2" : ""}>
          {hasImage ? (
            <div className="bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied image of unknown aspect ratio, shown on demand in a modal */}
              <img
                src={config.imageUrl}
                alt={config.title || "Napoli 7 promotion"}
                className="mx-auto block max-h-[45vh] w-full object-contain md:max-h-[80vh]"
              />
            </div>
          ) : null}

          {hasText || hasCta ? (
            <div
              className={
                "flex min-h-0 flex-col gap-6 p-6 md:p-8 " +
                (hasImage && !sideBySide ? "border-t border-border" : "")
              }
            >
              {hasText ? (
                <div className="flex flex-col gap-3">
                  {config.title ? (
                    <h2 className="font-display text-2xl uppercase tracking-[0.05em] leading-[1.1] md:text-3xl">
                      {config.title}
                    </h2>
                  ) : null}
                  {config.body ? (
                    <DialogDescription className="text-sm leading-relaxed text-muted-foreground md:text-base">
                      {config.body}
                    </DialogDescription>
                  ) : null}
                </div>
              ) : null}

              {hasCta ? (
                <div className="mt-auto flex flex-col gap-3 pt-2">
                  {error ? (
                    <p role="status" className="text-xs text-flag-red">
                      {error}
                    </p>
                  ) : null}
                  {config.ctaType === "link" && config.ctaHref ? (
                    <Link
                      href={config.ctaHref}
                      onClick={dismiss}
                      className={primaryCls}
                    >
                      <span className="block text-center">{primaryLabel}</span>
                    </Link>
                  ) : config.ctaType === "copy" && config.ctaCode ? (
                    <button type="button" onClick={copyCode} className={primaryCls}>
                      {primaryLabel}
                    </button>
                  ) : config.ctaType === "redeem" && config.ctaCode ? (
                    <button
                      type="button"
                      onClick={redeem}
                      disabled={redeeming}
                      aria-busy={redeeming}
                      className={primaryCls}
                    >
                      {primaryLabel}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={dismiss}
                    className="self-center font-display text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Maybe later
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
