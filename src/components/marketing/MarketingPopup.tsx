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
 * The admin-configurable storefront popup. Opens once per browser session
 * (immediately or after `delaySeconds`), showing the configured image + message
 * and a call-to-action: a link, a copy-code button, or a redeem-to-cart button.
 * It re-appears in a new session whenever the admin changes its content (the
 * session key is derived from a signature of that content).
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

  // Open once per session after the configured delay, unless already seen. Marks
  // itself seen as soon as it opens so it won't reappear on the next navigation.
  useEffect(() => {
    if (!config.enabled) return;
    const key = `${SEEN_PREFIX}${signature}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      // sessionStorage unavailable (private mode) — just show it this once.
    }
    // Open after the delay, but do NOT mark it seen just for showing. It's only
    // "handled" for the session once the customer engages (Order now / Maybe
    // later). Closing another way — the X, clicking outside, or Escape — leaves
    // it un-dismissed, so it opens again on the next page they land on.
    const timer = window.setTimeout(
      () => setOpen(true),
      Math.max(0, config.delaySeconds) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [config.enabled, config.delaySeconds, signature]);

  if (!config.enabled) return null;

  // Remember, for this browser session, that the customer acted on the popup, so
  // it stops reappearing. Keyed by content signature, so editing the popup makes
  // it show again even to someone who dismissed the old one.
  function markHandled() {
    try {
      sessionStorage.setItem(`${SEEN_PREFIX}${signature}`, "1");
    } catch {
      /* ignore */
    }
  }

  // "Maybe later" / "Order now" — an explicit choice, so don't show it again.
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
