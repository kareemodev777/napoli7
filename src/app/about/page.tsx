import type { Metadata } from "next";
import Image from "next/image";
import { Flame, Leaf, Clock, ShieldCheck } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { FeatureTiles } from "@/components/site/FeatureTiles";
import { getSiteImages } from "@/lib/site-images";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "About Napoli 7",
  description:
    "Napoli 7 brings authentic Neapolitan pizza to Ajman, blending Italian craftsmanship with the multicultural spirit of the UAE.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Napoli 7",
    description:
      "Authentic Neapolitan pizza inspired by the world, crafted in the UAE.",
  },
};

const tiles = [
  {
    icon: Flame,
    title: "Neapolitan oven",
    description:
      "Every pizza is baked at high temperature in our handmade Neapolitan oven for a soft, airy cornicione.",
  },
  {
    icon: Leaf,
    title: "Italian ingredients",
    description:
      "Imported Caputo flour, San Marzano DOP tomatoes, premium Italian ingredients, and traditional technique.",
  },
  {
    icon: Clock,
    title: "Slow fermentation",
    description:
      "True Neapolitan dough, prepared with patience, handcrafted skill, and the rhythm of proper fermentation.",
  },
  {
    icon: ShieldCheck,
    title: "Crafted in the UAE",
    description:
      "Italian tradition reimagined for the Emirates, bringing cultures and flavours together around the same table.",
  },
];

const aboutParagraphs = [
  "Napoli 7 was born from a simple vision: bringing authentic Neapolitan pizza to the United Arab Emirates, starting from Ajman.",
  "Inspired by Naples — the birthplace of pizza — we prepare true Neapolitan dough using imported Italian Caputo flour, slow fermentation, and traditional handcrafted techniques. Every pizza is baked in our handmade Neapolitan oven at high temperature to create the signature soft, airy crust of authentic pizza Napoletana.",
  "Our classic pizzas honor Italian tradition with San Marzano DOP tomatoes, premium Italian ingredients, and authentic craftsmanship.",
  "But Napoli 7 is also inspired by the multicultural identity of the UAE itself. Alongside our traditional Napoli Classics, we created the Ajman Collection: a unique menu inspired by the many cultures and communities that shape everyday life across the Emirates.",
  "From local Emirati creations, including our signature camel pizza, to inspirations from Pakistani, Indian, Bangladeshi, Filipino, Ethiopian, Egyptian and American cuisines, every pizza combines authentic Neapolitan craftsmanship with flavors and ingredients inspired by each culture’s culinary traditions.",
  "The name Napoli 7 was inspired by the seven Emirates of the UAE and by the timeless symbolism of the number 7 — often associated with harmony, unity, and perfection — reflecting our vision to share our pizzas far beyond borders.",
];

const storyParagraphs = [
  "Napoli 7 began with a lifelong passion for authentic Neapolitan pizza.",
  "As the son of a Neapolitan family, I grew up surrounded by the aroma of fresh dough, wood-fired ovens, and the traditions of Italian cooking. From an early age, I understood that true Neapolitan pizza was something unique — simple, authentic, and deeply connected to Italian culture.",
  "Curious and passionate, I spent years learning the craft. I worked in pizzerias, trained with experienced pizzaioli, and discovered the traditional techniques that make Neapolitan pizza so special.",
  "During my travels, I saw how Neapolitan pizza had crossed borders and reached cultures all around the world — from Europe to the United States, Asia, the Middle East, and beyond — appreciated everywhere for its authenticity, simplicity, and flavour.",
  "That journey inspired the idea behind Napoli 7.",
  "Not only to bring authentic Neapolitan pizza to the United Arab Emirates, but also to create a place where the traditions of Naples could meet the multicultural spirit of the UAE.",
  "Today, Napoli 7 combines authentic Italian craftsmanship with flavours inspired by the many cultures that shape life across the Emirates — while always staying true to the soul of Neapolitan pizza.",
  "Napoli 7 was inspired by a simple belief: great pizza can bring cultures, people, and traditions together around the same table.",
];

export default async function AboutPage() {
  const images = await getSiteImages();
  const cultures = images.about_cultures;
  return (
    <SiteShell>
      <PageHero
        eyebrow="Our story"
        heading="About Napoli 7"
        intro="Authentic Neapolitan Pizza inspired by the world, crafted in the UAE. Neapolitan tradition, reimagined for the Emirates."
      />

      <section className="border-t border-border px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1140px] mx-auto grid md:grid-cols-[0.85fr_1.15fr] gap-12 md:gap-20 items-start">
          <div className="md:sticky md:top-24">
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              ABOUT NAPOLI7
            </h2>
            <div className="relative mt-8 aspect-[3/2] w-full overflow-hidden rounded-md border border-border bg-muted">
              <Image
                src={cultures.url}
                alt={cultures.alt}
                fill
                sizes="(min-width: 768px) 42vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
          <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            {aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <div className="border-l-2 border-brand pl-5 text-foreground">
              <p className="font-display text-2xl md:text-3xl leading-tight">
                At Napoli 7, our mission is simple: creating a place where
                cultures, flavors, and people come together.
              </p>
              <p className="mt-5 text-muted-foreground">
                Napoli 7 — Authentic Neapolitan Pizza inspired by the world,
                crafted in the UAE.
              </p>
              <p className="mt-2 text-muted-foreground">
                Neapolitan tradition, reimagined for the Emirates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FeatureTiles tiles={tiles} />

      <section className="border-t border-border px-6 md:px-10 py-16 md:py-24 bg-brand-soft">
        <div className="max-w-[1140px] mx-auto grid md:grid-cols-[0.85fr_1.15fr] gap-12 md:gap-20 items-start">
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-brand-deep mb-4">
              Our Story
            </p>
            <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              From Naples to the Emirates
            </h2>
          </div>
          <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
