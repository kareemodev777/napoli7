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

      {/* Welcome offer sticker — bottom-right, brand azure */}
      <Link
        href="/deals"
        aria-label="First Margherita on us — sign up to claim"
        className="absolute right-2 sm:right-6 md:right-12 bottom-2 sm:bottom-8 md:bottom-12 z-10 w-[88px] h-[88px] sm:w-[140px] sm:h-[140px] md:w-[170px] md:h-[170px] grid place-items-center text-white font-display hover:rotate-0 -rotate-[8deg] transition-transform duration-500"
        style={{
          background: "var(--color-brand)",
          clipPath:
            "polygon(50% 0%, 58% 8%, 68% 3%, 73% 13%, 84% 11%, 86% 22%, 96% 25%, 94% 36%, 100% 45%, 94% 54%, 100% 65%, 90% 70%, 92% 81%, 81% 83%, 79% 94%, 68% 90%, 60% 98%, 50% 92%, 40% 98%, 32% 90%, 21% 94%, 19% 83%, 8% 81%, 10% 70%, 0% 65%, 6% 54%, 0% 45%, 6% 36%, 4% 25%, 14% 22%, 16% 11%, 27% 13%, 32% 3%, 42% 8%)",
        }}
      >
        <span className="text-center leading-tight px-3">
          <span className="block text-[11px] tracking-[0.2em] uppercase">
            First Pizza
          </span>
          <span className="block text-lg italic font-medium mt-1 normal-case tracking-normal">
            on us
          </span>
        </span>
      </Link>
    </section>
  );
}
