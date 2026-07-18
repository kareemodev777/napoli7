import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Delivery",
  description:
    "Delivery zones, estimated time, fees, and arrival protocol for Napoli 7 in Ajman.",
  alternates: { canonical: "/delivery" },
  openGraph: {
    title: "Delivery · Napoli 7",
    description: "Hot from our oven to your door, in around thirty minutes.",
  },
};

// The areas we deliver to. This is the same list the checkout dropdown is seeded
// with (migration 027) — keep the two in step, or the page will promise an area
// the customer cannot then select.
const DELIVERY_AREAS = [
  "Al Jurf",
  "Al Nuaimiya",
  "Al Rashidiya",
  "Al Rumailah",
  "Al Nakheel",
  "Al Bustan",
  "Ajman Corniche",
  "Al Zahra",
  "Al Hamidiya",
  "Al Rawda",
  "Al Mowaihat",
  "Al Tallah",
  "Al Yasmeen",
  "Al Helio",
  "Al Zahya",
  "Al Alia",
  "Al Raqaib",
  "Ajman Industrial Area",
  "Emirates City",
  "Al Zorah",
];

const sections: { heading: string; body: string[] }[] = [
  {
    heading: "Service area",
    body: [
      // Both halves matter. The radius alone would be a false promise: about a
      // third of a 7 km circle around the shop is Sharjah or open sea, and a
      // pin dropped there is refused at checkout however close it is.
      `We deliver inside Ajman only, within a 7 km radius of Napoli 7. Sharjah and the other emirates are outside our zone, even where they fall inside that radius.`,
      `Delivery areas in Ajman: ${DELIVERY_AREAS.join(", ")}.`,
      // Some of these areas are large enough to reach past the 7 km radius, so
      // listing one is not a promise that every address in it is reachable. The
      // map pin at checkout is what confirms it, and it is better to say so here
      // than to let someone fill a basket and get refused at the last step.
      "The outer edges of some of these areas fall beyond the 7 km radius. Drop your pin on the map at checkout and we'll confirm straight away whether we can reach you.",
      "Outside our delivery area? Choose Pickup, and your order will be ready in approximately 15 minutes.",
    ],
  },
  {
    heading: "Estimated delivery time",
    body: [
      "Most orders are delivered within 20–35 minutes from order confirmation.",
      "Delivery times may be longer during peak hours, weekends, holidays, or adverse weather conditions.",
    ],
  },
  {
    heading: "Delivery fees",
    body: [
      "Minimum order for delivery: 13 AED.",
      "Flat delivery fee: 9 AED anywhere within our delivery zone, plus a 3 AED service fee.",
      "FREE delivery on orders of 80 AED or more — this waives the 9 AED delivery fee; the 3 AED service fee still applies.",
      "Pickup orders pay neither fee.",
    ],
  },
  {
    heading: "Order cancellations",
    body: [
      "Orders may be cancelled only before preparation begins.",
      "Once your order status changes to Preparing, it can no longer be cancelled or modified.",
    ],
  },
  {
    heading: "Delivery arrival",
    body: [
      "Our driver will contact you upon arrival.",
      "Please ensure your phone is available and that your delivery address is complete and accurate, to help us deliver your order as quickly as possible.",
    ],
  },
  {
    heading: "Important notice",
    body: [
      "Delivery times are estimates and may vary depending on traffic, weather conditions, and order volume.",
      "Thank you for choosing Napoli 7! 🇮🇹🍕",
    ],
  },
];

export default function DeliveryPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="How it arrives"
        heading="Delivery"
        intro="Hot from our oven to your door, in around thirty minutes."
      />

      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[820px] mx-auto space-y-12">
          {sections.map((s) => (
            <article key={s.heading}>
              <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[1.5px] mb-4">
                {s.heading}
              </h2>
              <div className="space-y-3">
                {s.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-[65ch]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </article>
          ))}

          <Link
            href="/menu"
            className="mt-10 inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
          >
            Order now
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
