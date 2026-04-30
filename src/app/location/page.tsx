import type { Metadata } from "next";
import Link from "next/link";
import {
  MapPin,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  Navigation,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { MapEmbed } from "@/components/site/MapEmbed";
import en from "@/i18n/en.json";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Location",
  description:
    "Visit Napoli 7 at Shop 4, opposite Delta Supermarket, 213 Sheikh Rashid bin Abdul Aziz Street, Al Jurf 2, Ajman. Open daily 11:00–22:00.",
  alternates: { canonical: "/location" },
  openGraph: {
    title: "Location · Napoli 7",
    description: "Shop 4, Al Jurf 2, Ajman. Open daily 11:00–22:00.",
  },
};

export default function LocationPage() {
  const lat = en.brand.lat;
  const lng = en.brand.lng;
  const directionsUrl = `https://maps.google.com/?q=${lat},${lng}`;

  return (
    <SiteShell>
      <PageHero eyebrow="Visit" heading="Location" intro={en.location.intro} />

      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
          <div className="space-y-8">
            <Block icon={MapPin} title="Address">
              <p>{en.brand.addressLine1}</p>
              <p>{en.brand.addressLine2}</p>
              <Link
                href={directionsUrl}
                target="_blank"
                rel="noopener"
                className="mt-4 inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] uppercase border-b border-foreground pb-1 hover:border-brand hover:text-brand"
              >
                <Navigation className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                Get directions
              </Link>
            </Block>
            <Block icon={Clock} title="Hours">
              <p>{en.brand.hours}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Including weekends and most public holidays.
              </p>
            </Block>
            <Block icon={Phone} title="Phone">
              <a
                href={`tel:${en.brand.phoneTel}`}
                className="hover:underline underline-offset-4"
              >
                {en.brand.phone}
              </a>
            </Block>
            <Block icon={MessageCircle} title="WhatsApp">
              <a
                href={en.brand.whatsappLink}
                target="_blank"
                rel="noopener"
                className="hover:underline underline-offset-4"
              >
                {en.brand.whatsapp}
              </a>
            </Block>
            <Block icon={Mail} title="Email">
              <a
                href={`mailto:${en.brand.email}`}
                className="hover:underline underline-offset-4"
              >
                {en.brand.email}
              </a>
            </Block>
          </div>
          <div>
            <MapEmbed lat={lat} lng={lng} />
            <div className="mt-6 border border-border bg-card p-6">
              <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
                Delivery zone
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {en.location.deliveryNote}
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Block({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-brand" strokeWidth={1.5} aria-hidden />
        <h2 className="font-display text-xs tracking-[0.25em] uppercase">
          {title}
        </h2>
      </div>
      <div className="mt-3 text-base leading-relaxed">{children}</div>
    </div>
  );
}
