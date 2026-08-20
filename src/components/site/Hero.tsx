"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SiteImage } from "@/lib/site-images";
import { SITE_IMAGE_DEFAULTS } from "@/lib/site-images";

export function Hero({
  image = SITE_IMAGE_DEFAULTS.home_hero,
}: {
  image?: SiteImage;
}) {
  // Single Ajman branch for now. When more UAE locations are added, the area /
  // branch picker comes back here, driven by the zones managed in admin.
  const [mode, setMode] = useState<"deliver" | "pickup">("deliver");
  const orderHref = "/menu";
  const orderLabel = "order now";
  const orderAria = "Order now";

  return (
    <section className="relative mx-4 md:mx-6 h-[62svh] md:h-[68svh] min-h-[460px] max-h-[640px] overflow-hidden">
      <h1 className="sr-only">Napoli 7 — authentic Neapolitan pizza in Ajman</h1>
      <Image
        src={image.url}
        alt={image.alt}
        fill
        priority
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-left md:object-center"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden />

      {/* Centered ordering widget — shown on all breakpoints. The area picker is
          intentionally omitted while Napoli 7 runs a single Ajman branch; it
          returns once admin manages multiple UAE locations. */}
      <div className="relative z-10 h-full flex items-center justify-center px-4">
        <div className="bg-background w-full max-w-sm p-6 md:p-7 shadow-2xl">
          <p className="font-display text-sm mb-1">Hello</p>
          <p className="text-lg font-display mb-4">How would you like your pizza?</p>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <button
              type="button"
              className="order-toggle"
              data-active={mode === "deliver"}
              onClick={() => setMode("deliver")}
            >
              deliver
            </button>
            <button
              type="button"
              className="order-toggle"
              data-active={mode === "pickup"}
              onClick={() => setMode("pickup")}
            >
              pickup
            </button>
          </div>

          <div className="mt-4 space-y-2">
            <Link href={orderHref} className="arrow-btn" aria-label={orderAria}>
              {orderLabel}
            </Link>
            <Link
              href="/about"
              className="inline-flex text-[11px] font-display underline-offset-4 hover:underline text-muted-foreground"
            >
              About Napoli 7
            </Link>
          </div>

          <p className="font-display text-[11px] text-muted-foreground mt-3 text-center">
            Tue – Sun 12:30 – 00:00
          </p>
        </div>
      </div>

    </section>
  );
}
