import type { Metadata } from "next";
import Link from "next/link";
import { Check, Truck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { WELCOME_OFFER } from "@/data/mock/deals";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Deals",
  description:
    "Welcome offers and seasonal deals from Napoli 7 — your first Margherita on us, weekday lunch sets, and family bundles.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: "Deals · Napoli 7",
    description:
      "Your first Margherita on us. Weekday lunch sets. Family bundles.",
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
      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[2fr_1fr] gap-10 items-start">
          <article className="border border-border bg-card p-8 md:p-12">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
              Welcome offer
            </p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              {WELCOME_OFFER.title}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-[60ch] leading-relaxed">
              {WELCOME_OFFER.description}
            </p>
            <div className="mt-6 flex items-start gap-3 text-base text-muted-foreground max-w-[60ch]">
              <Truck
                className="h-5 w-5 mt-0.5 text-azure-deep shrink-0"
                strokeWidth={1.5}
                aria-hidden
              />
              <p>
                If you upgrade to another pizza, delivery is available.{" "}
                <Link
                  href="/delivery"
                  className="text-azure-deep underline underline-offset-4 hover:text-brand"
                >
                  We deliver!
                </Link>
              </p>
            </div>
            <ul className="mt-8 space-y-3">
              {WELCOME_OFFER.conditions.map((c) => (
                <li key={c} className="flex items-start gap-3 text-sm">
                  <Check
                    className="h-4 w-4 mt-0.5 text-brand shrink-0"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
            <Link
              href={WELCOME_OFFER.cta.href}
              className="mt-10 inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
            >
              {WELCOME_OFFER.cta.label}
            </Link>
          </article>
          <aside className="border-t lg:border-t-0 lg:border-l border-border lg:pl-10 pt-10 lg:pt-0">
            <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
              Fine print
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The kitchen reserves the right to substitute items in case of
              supply shortage. One promotional code per order. Cannot be combined
              with other offers unless stated.
            </p>
          </aside>
        </div>
      </section>
    </SiteShell>
  );
}
