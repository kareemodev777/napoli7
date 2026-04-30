"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <main
      id="main"
      className="min-h-[80vh] flex items-center justify-center px-6 md:px-10 py-24 bg-background text-foreground"
    >
      <div className="max-w-[640px] text-center">
        <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6">
          Something went wrong
        </p>
        <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[1.5px] leading-tight">
          We hit a snag
        </h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[55ch] mx-auto">
          Try the action again. If it keeps happening, the kitchen line is on{" "}
          <a className="underline hover:text-foreground" href="tel:+97165345772">
            +971 6 534 5772
          </a>{" "}
          and answers between 11:00 and 22:00.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center border border-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
