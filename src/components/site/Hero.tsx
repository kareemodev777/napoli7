"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function Hero() {
  const [mode, setMode] = useState<"deliver" | "pickup">("deliver");
  const [postcode, setPostcode] = useState("");

  return (
    <section className="relative mx-4 md:mx-6 h-[62svh] md:h-[68svh] min-h-[460px] max-h-[640px] overflow-hidden">
      <Image
        src="/images/hero-pizza.jpg"
        alt="Hand-stretched Neapolitan pizza, fresh from a wood-fired oven"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/10" aria-hidden />

      {/* Centered ordering widget */}
      <div className="relative z-10 h-full flex items-center justify-center px-4">
        <div className="bg-background w-full max-w-sm p-6 md:p-7 shadow-2xl">
          <p className="font-display text-sm mb-3">Hello</p>

          <input
            type="text"
            inputMode="text"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Your area in Ajman"
            className="w-full text-lg font-display py-2 border-b-2 border-foreground bg-transparent focus:outline-none placeholder:text-muted-foreground"
          />
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

          <Link
            href="/menu"
            className="arrow-btn mt-4"
            aria-label="Start your order"
          >
            order
          </Link>

          <p className="font-display text-[11px] text-muted-foreground mt-3 text-center">
            Open daily 11:00 – 22:00
          </p>
        </div>
      </div>

      {/* Welcome offer sticker — bottom-right, brand azure */}
      <Link
        href="/deals"
        aria-label="First Margherita on us — sign up to claim"
        className="absolute right-6 md:right-12 bottom-8 md:bottom-12 z-10 w-[140px] h-[140px] md:w-[170px] md:h-[170px] grid place-items-center text-white font-display hover:rotate-0 -rotate-[8deg] transition-transform duration-500"
        style={{
          background: "var(--color-azure)",
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
