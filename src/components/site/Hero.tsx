"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SiteImage } from "@/lib/site-images";
import { SITE_IMAGE_DEFAULTS } from "@/lib/site-images";
import { useOrderingAvailability } from "@/lib/use-ordering-availability";
import { filterDeliveryZones, type DeliveryZone } from "@/lib/checkout";

function normalizeArea(area: string): string {
  return area.trim().toLowerCase().replace(/\s+/g, " ");
}

function checkoutHref(area: string): string {
  return `/checkout?area=${encodeURIComponent(area)}`;
}

export function Hero({
  image = SITE_IMAGE_DEFAULTS.home_hero,
  deliveryZones = [],
}: {
  image?: SiteImage;
  deliveryZones?: DeliveryZone[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"deliver" | "pickup">("deliver");
  const [postcode, setPostcode] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const { availability } = useOrderingAvailability();
  const orderingOpen = availability?.isOpen ?? true;
  const suggestions = useMemo(
    () => filterDeliveryZones(deliveryZones, postcode, 5),
    [deliveryZones, postcode],
  );
  const exactMatch = useMemo(
    () =>
      deliveryZones.find(
        (zone) => normalizeArea(zone.area) === normalizeArea(postcode),
      ) ?? null,
    [deliveryZones, postcode],
  );
  const highlightedZone =
    highlightedIndex >= 0 ? suggestions[highlightedIndex] ?? null : null;
  const bestMatch = highlightedZone ?? exactMatch ?? suggestions[0] ?? null;
  const orderHref = orderingOpen
    ? bestMatch
      ? checkoutHref(bestMatch.area)
      : "/register"
    : "/location";
  const orderLabel = orderingOpen
    ? bestMatch
      ? `use ${bestMatch.area}`
      : "create your account"
    : "see opening hours";
  const orderAria = orderingOpen
    ? bestMatch
      ? `Use ${bestMatch.area}`
      : "Create your account"
    : "See opening hours";

  function handleAreaKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!postcode.trim() || suggestions.length === 0) {
      if (event.key === "Enter") {
        event.preventDefault();
        router.push(orderHref);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) => (current + 1 + suggestions.length) % suggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current === -1 ? suggestions.length - 1 : (current - 1 + suggestions.length) % suggestions.length,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const target = highlightedZone ?? bestMatch ?? suggestions[0];
      router.push(target ? checkoutHref(target.area) : orderHref);
      return;
    }

    if (event.key === "Escape") {
      setHighlightedIndex(-1);
    }
  }

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
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden />

      {/* Centered ordering widget — hidden below lg, where MobileBottomBar
          (lg:hidden) already provides a persistent order + cart CTA, so this
          card would be redundant on mobile/tablet. */}
      <div className="relative z-10 h-full hidden lg:flex items-center justify-center px-4">
        <div className="bg-background w-full max-w-sm p-6 md:p-7 shadow-2xl">
          <p className="font-display text-sm mb-3">Hello</p>

          <div className="relative">
            <input
              type="text"
              inputMode="text"
              value={postcode}
              onChange={(e) => {
                setPostcode(e.target.value);
                setHighlightedIndex(-1);
              }}
              onKeyDown={handleAreaKeyDown}
              placeholder="Your area in Ajman"
              aria-label="Your delivery area in Ajman"
              role="combobox"
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-expanded={postcode.trim().length > 0}
              aria-controls="hero-area-suggestions"
              className="w-full text-lg font-display py-2 border-b-2 border-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground"
            />

            {postcode.trim() ? (
              <div
                id="hero-area-suggestions"
                role="listbox"
                aria-label="Delivery areas"
                className="absolute left-0 right-0 top-full z-20 mt-3 border border-border bg-background shadow-2xl"
              >
                {suggestions.length > 0 ? (
                  <div className="py-2">
                    <p className="px-4 pb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      Areas near your search
                    </p>
                    <div className="max-h-64 overflow-auto">
                      {suggestions.map((zone, index) => {
                        const active = index === highlightedIndex;
                        return (
                          <Link
                            key={zone.area}
                            href={orderingOpen ? checkoutHref(zone.area) : "/location"}
                            role="option"
                            aria-selected={active}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={
                              "flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors " +
                              (active ? "bg-muted" : "hover:bg-muted")
                            }
                          >
                            <span className="font-medium text-foreground">{zone.area}</span>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {orderingOpen ? `AED ${zone.fee}` : "hours"}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    No matching area yet. Try a different one.
                  </p>
                )}
              </div>
            ) : null}
          </div>

          <Link
            href="/location"
            className="inline-block text-[11px] font-display mt-2 underline-offset-4 hover:underline text-muted-foreground"
          >
            Outside our zone?
          </Link>

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
