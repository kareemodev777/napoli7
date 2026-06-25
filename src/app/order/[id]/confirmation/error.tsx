"use client";

import Link from "next/link";

/**
 * Confirmation-route error boundary. Reaching this URL means the order was
 * already placed (and, for card, paid via Stripe's success_url) — so even if the
 * page fails to render, the order is safe. Show a reassuring message instead of
 * the generic "couldn't load". Kept self-contained (no shared layout components)
 * so the boundary itself can never re-throw.
 */
export default function ConfirmationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="px-6 md:px-10 py-20 md:py-28">
        <div className="max-w-[720px] mx-auto">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
            Order confirmed
          </p>
          <h1 className="font-display text-4xl md:text-5xl leading-tight">
            Your order is in. ✅
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your payment went through and we&rsquo;ve received your order — this
            page just had trouble loading the details. Your order is safe and the
            kitchen has it. Check your email for the confirmation, or reload to
            see the details.
          </p>
          <p className="mt-3 text-base text-muted-foreground">
            Any questions, call us on{" "}
            <a className="text-foreground underline underline-offset-4" href="tel:+97165345772">
              +971 6 534 5772
            </a>
            .
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
            >
              Reload
            </button>
            <Link
              href="/track"
              className="inline-flex items-center border border-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
            >
              Track your order
            </Link>
            <Link
              href="/menu"
              className="inline-flex items-center px-2 py-4 font-display text-sm tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground"
            >
              Back to menu
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
