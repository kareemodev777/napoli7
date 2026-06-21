import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  SITE_IMAGE_DEFAULTS,
  type SiteImageKey,
  type SiteImageMap,
} from "@/lib/site-images";

interface Block {
  imageKey: SiteImageKey;
  eyebrow: string;
  title: string;
  body: string[];
  cta?: { label: string; href: string };
}

const blocks: Block[] = [
  {
    imageKey: "home_family",
    eyebrow: "Join the Napoli 7 family",
    title: "Great pizza brings great people together.",
    body: [
      "Create your Napoli 7 account and become part of our community.",
      "The first 1,000 members receive a free Margherita pizza on us. Prefer another pizza? We'll deduct the value of your free Margherita from any pizza on our menu — so don't miss out.",
    ],
    cta: { label: "Join the family", href: "/deals" },
  },
  {
    imageKey: "home_tradition",
    eyebrow: "Born of Neapolitan tradition",
    title: "Authenticity starts with the ingredients.",
    body: [
      "Caputo flour from Naples. San Marzano DOP tomatoes from southern Italy. A handcrafted Neapolitan oven built in Naples and imported to the UAE.",
      "Designed to reach temperatures of up to 450°C, our oven delivers the light, airy crust and distinctive character of true Neapolitan pizza. Together with a 48-hour fermented dough and traditional Neapolitan craftsmanship, they create the foundation of every Napoli 7 pizza.",
    ],
  },
  {
    imageKey: "home_philosophy",
    eyebrow: "Our philosophy",
    title: "Rooted in Naples. Open to the world.",
    body: [
      "The soul stays in Naples. The dough, the technique and the foundations of every pizza remain authentically Neapolitan.",
      "The journey begins when we add the toppings. Inspired by the many cultures that call the UAE home, we combine Neapolitan craftsmanship with flavours from around the world to create pizzas that are both authentic and unexpected.",
    ],
  },
];

export function HomeStory({
  images = SITE_IMAGE_DEFAULTS,
}: {
  images?: SiteImageMap;
}) {
  return (
    <section className="px-6 md:px-10 py-20 md:py-28 max-w-[1500px] mx-auto">
      <div className="space-y-16 md:space-y-24">
        {blocks.map((b, i) => (
          <div
            key={b.title}
            className="grid md:grid-cols-2 gap-8 md:gap-14 items-center"
          >
            <div
              className={
                "relative aspect-[16/9] w-full overflow-hidden " +
                (i % 2 === 1 ? "md:order-2" : "")
              }
            >
              <Image
                src={images[b.imageKey].url}
                alt={images[b.imageKey].alt}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                loading="lazy"
                className="object-cover"
              />
            </div>
            <div className={i % 2 === 1 ? "md:order-1" : ""}>
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-4">
                {b.eyebrow}
              </p>
              <h2 className="font-display text-3xl md:text-4xl leading-[1.05] mb-6 text-balance">
                {b.title}
              </h2>
              <div className="space-y-4 text-base text-muted-foreground leading-relaxed max-w-[52ch]">
                {b.body.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              {b.cta ? (
                <Link
                  href={b.cta.href}
                  className="mt-8 inline-flex items-center gap-2 font-display text-sm border-b border-foreground pb-1 hover:opacity-60"
                >
                  {b.cta.label}
                  <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                </Link>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
