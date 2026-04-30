import type { Metadata } from "next";
import { Flame, Leaf, Clock, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { FeatureTiles } from "@/components/site/FeatureTiles";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About — Our Story",
  description:
    "Napoli 7 is built on Neapolitan tradition: Caputo flour, San Marzano DOP, lievito madre, a 450°C oven, and the philosophy of doing seven pizzas perfectly.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Napoli 7",
    description:
      "Caputo flour, San Marzano DOP, lievito madre, 450°C oven, the philosophy of seven.",
  },
};

const tiles = [
  {
    icon: Flame,
    title: "Wood-fired",
    description:
      "Hand-built Neapolitan oven, 450°C floor, ninety-second bake. The leoparded crust is not optional.",
  },
  {
    icon: Leaf,
    title: "Fresh ingredients",
    description:
      "Caputo 00 flour, San Marzano DOP tomato, fior di latte mozzarella, basil cut on the day.",
  },
  {
    icon: Clock,
    title: "Fast delivery",
    description:
      "Pickup in about fifteen minutes; delivery to Al Jurf in about thirty. Every order is timed.",
  },
  {
    icon: ShieldCheck,
    title: "Hygiene first",
    description:
      "Ajman Municipality grade A. Daily cleaning logs. Every pizza is handled by gloved hands.",
  },
];

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Our story"
        heading="About"
        intro="A Neapolitan family table, brought to Ajman with the same patience, the same flour, and the same uncompromising bake."
      />

      <section className="border-t border-border px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1140px] mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-start">
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
              Founder
            </p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Born by the bay of Naples
            </h2>
            <div className="mt-6 space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-[60ch]">
              <p>
                The kitchen behind Napoli 7 grew up in a Neapolitan home where dough rested for two
                days, where tomatoes were peeled by hand, and where the Sunday pizza was a
                ritual that pulled three generations to the same table.
              </p>
              <p>
                Bringing that ritual to Ajman meant changing nothing important. The flour is
                still Caputo. The tomato is still San Marzano DOP. The starter — our{" "}
                <em className="italic">lievito madre</em> — was carried over and is fed every
                morning.
              </p>
            </div>
          </div>
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
              The craft
            </p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Caputo, San Marzano, schiaffo
            </h2>
            <div className="mt-6 space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-[60ch]">
              <p>
                The base is hand-stretched — the{" "}
                <em className="italic">schiaffo napoletano</em> — never rolled. The dough rests
                for forty-eight hours, picks up its sour, opens up like a balloon. The cornicione
                is soft to the touch and structured at the same time.
              </p>
              <p>
                The oven runs at 450°C. The pizza enters and turns three times. In ninety seconds
                the crust is dappled, the cheese has just melted, the basil has wilted exactly
                once. There is no shortcut and no compromise.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FeatureTiles tiles={tiles} />

      <section className="border-t border-border px-6 md:px-10 py-16 md:py-24 bg-brand-soft">
        <div className="max-w-[920px] mx-auto text-center">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-brand-deep mb-4">
            Philosophy
          </p>
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
            Seven, perfectly
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[55ch] mx-auto">
            The name comes from the discipline of doing seven pizzas perfectly rather than
            seventy passably. A short menu makes a better kitchen, a better dough, and a better
            customer experience. The seven core pizzas on our menu have been refined over years.
            They are not going anywhere.
          </p>
        </div>
      </section>
    </SiteShell>
  );
}
