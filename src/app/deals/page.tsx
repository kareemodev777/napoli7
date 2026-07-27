import type { Metadata } from "next";
import Link from "next/link";
import { Check, Truck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { GRAND_OPENING_DEAL, WELCOME_OFFER } from "@/data/mock/deals";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Grand Opening — 50% off the entire Napoli 7 menu (28 July–28 August), plus your first small Margherita on us for pickup, weekday lunch sets, and family bundles.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: "Deals · Napoli 7",
    description:
      "Grand Opening: 50% off the entire menu, 28 July–28 August. Plus your first small Margherita on us, for pickup.",
  },
};

export default function DealsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Offers"
        heading="Deals"
        intro="Welcome offers, seasonal specials, and bundles from the Napoli 7 kitchen."
      />
      <section className="px-6 md:px-10 pt-16 md:pt-24">
        <div className="max-w-[760px] mx-auto">
          {/* Grand Opening – 50% OFF. A separate, featured promotion above the
              standing Free Pizza welcome offer (which is unchanged). */}
          <article className="border border-border bg-card overflow-hidden">
            <div className="relative aspect-[1128/1600] w-full bg-muted">
              <SmartImage
                src={GRAND_OPENING_DEAL.image.src}
                alt={GRAND_OPENING_DEAL.image.alt}
                fill
                priority
                sizes="(min-width: 768px) 760px, 100vw"
                className="object-contain"
              />
            </div>
            <div className="p-8 md:p-12">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-brand mb-4">
                {GRAND_OPENING_DEAL.eyebrow}
              </p>
              <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
                {GRAND_OPENING_DEAL.title}
              </h2>
              <p className="mt-6 text-lg text-muted-foreground max-w-[60ch] leading-relaxed">
                {GRAND_OPENING_DEAL.intro}
              </p>
              <ul className="mt-8 space-y-3">
                {GRAND_OPENING_DEAL.points.map((point) => (
                  <li key={point} className="flex items-start gap-3 text-base">
                    <Check
                      className="h-5 w-5 mt-0.5 text-brand shrink-0"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 font-display text-xs tracking-[0.25em] uppercase text-azure-deep">
                {GRAND_OPENING_DEAL.validity}
              </p>
              <Link
                href={GRAND_OPENING_DEAL.cta.href}
                className="mt-8 inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
              >
                {GRAND_OPENING_DEAL.cta.label}
              </Link>
            </div>
          </article>
        </div>
      </section>
      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[760px] mx-auto">
          <article className="border border-border bg-card p-8 md:p-12">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
              {WELCOME_OFFER.eyebrow}
            </p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              {WELCOME_OFFER.title}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-[60ch] leading-relaxed">
              {WELCOME_OFFER.intro}
            </p>

            <section className="mt-10">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
                {WELCOME_OFFER.pickup.heading}
              </p>
              <p className="flex items-start gap-3 text-base">
                <span aria-hidden>🍕</span>
                <span>{WELCOME_OFFER.pickup.item}</span>
              </p>
            </section>

            <section className="mt-10">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
                {WELCOME_OFFER.delivery.heading}
              </p>
              <div className="flex items-start gap-3 text-base text-muted-foreground max-w-[60ch]">
                <Truck
                  className="h-5 w-5 mt-0.5 text-azure-deep shrink-0"
                  strokeWidth={1.5}
                  aria-hidden
                />
                <div>
                  <p>{WELCOME_OFFER.delivery.intro}</p>
                  <ul className="mt-3 space-y-2">
                    {WELCOME_OFFER.delivery.upgrades.map((u) => (
                      <li key={u} className="flex items-start gap-3 text-sm">
                        <Check
                          className="h-4 w-4 mt-0.5 text-brand shrink-0"
                          strokeWidth={1.5}
                          aria-hidden
                        />
                        <span>{u}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm">{WELCOME_OFFER.delivery.note}</p>
                </div>
              </div>
            </section>

            <section className="mt-10">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
                {WELCOME_OFFER.orderTogether.heading}
              </p>
              <p className="text-base text-muted-foreground max-w-[60ch]">
                {WELCOME_OFFER.orderTogether.intro}
              </p>
              <ul className="mt-4 space-y-3">
                {WELCOME_OFFER.orderTogether.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm">
                    <Check
                      className="h-4 w-4 mt-0.5 text-brand shrink-0"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-10 border-t border-border pt-6">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
                ⏳ {WELCOME_OFFER.limited.heading}
              </p>
              <p className="text-sm text-muted-foreground max-w-[60ch]">
                {WELCOME_OFFER.limited.text}
              </p>
            </section>

            <Link
              href={WELCOME_OFFER.cta.href}
              className="mt-10 inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
            >
              {WELCOME_OFFER.cta.label}
            </Link>
          </article>
        </div>
      </section>
    </SiteShell>
  );
}
