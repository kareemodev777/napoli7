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

const sections = [
  {
    heading: "Service area",
    body: "We deliver across Al Jurf 1, Al Jurf 2, Al Jurf 3, Ajman City Centre, and Al Rashidiya. Outside our zone? Order for pickup at the shop and we will have it ready in fifteen minutes.",
  },
  {
    heading: "Estimated time",
    body: "Most deliveries arrive in 25–35 minutes from order confirmation. The kitchen confirms a tighter window when you place the order, based on current load.",
  },
  {
    heading: "Delivery fee",
    body: "Al Jurf areas: 5.00 AED, minimum 20.00 AED order. Ajman City Centre and Al Rashidiya: 10.00 AED, minimum 25.00 AED order. The exact fee for your area is shown at checkout.",
  },
  {
    heading: "Minimum order",
    body: "Each zone has a minimum order value. If your basket is below the minimum, we cannot route a driver to that area — choose pickup instead and we will hold the order for you.",
  },
  {
    heading: "Modifications policy",
    body: "Orders cannot be modified once the kitchen status moves to ‘preparing’. If you need to change quantities or remove an item, call us within five minutes of placing the order.",
  },
  {
    heading: "Arrival protocol",
    body: "Our drivers wait two minutes at the door, then call. If we cannot reach you within ten minutes, the order is returned to the kitchen and the order is considered abandoned.",
  },
  {
    heading: "Disclaimers",
    body: "Estimated times are good-faith estimates. Weather, traffic, or unusually high demand may extend delivery times. Refunds for late delivery follow our refund policy.",
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
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-[65ch]">
                {s.body}
              </p>
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
