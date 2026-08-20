import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { SmartImage } from "@/components/ui/SmartImage";
import { GRAND_OPENING_DEAL } from "@/data/mock/deals";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Grand Opening — 50% off the entire Napoli 7 menu, 28 July–28 August.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: "Deals · Napoli 7",
    description:
      "Grand Opening: 50% off the entire menu, 28 July–28 August.",
  },
};

export default function DealsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Offers"
        heading="Deals"
        intro="Seasonal specials and bundles from the Napoli 7 kitchen."
      />
      <section className="px-6 md:px-10 pt-16 md:pt-24">
        <div className="max-w-[760px] mx-auto">
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
    </SiteShell>
  );
}
