import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/ContactForm";
import { FaqAccordion } from "@/components/site/FaqAccordion";
import { FAQ_ITEMS } from "@/data/mock/faq";
import en from "@/i18n/en.json";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Napoli 7 — phone, WhatsApp, email, and our most-asked questions answered.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · Napoli 7",
    description: "Reach the kitchen — phone, WhatsApp, email, and FAQ.",
  },
};

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Contact"
        heading="Get in touch"
        intro={en.contact.intro}
      />

      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20 items-start">
          <div className="space-y-6">
            <h2 className="font-display text-2xl uppercase tracking-[1.5px]">
              Direct lines
            </h2>
            <dl className="space-y-4 text-base">
              <Row label="Phone">
                <a className="hover:underline" href={`tel:${en.brand.phoneTel}`}>
                  {en.brand.phone}
                </a>
              </Row>
              <Row label="WhatsApp">
                <a className="hover:underline" href={en.brand.whatsappLink}>
                  {en.brand.whatsapp}
                </a>
              </Row>
              <Row label="Email">
                <a className="hover:underline" href={`mailto:${en.brand.email}`}>
                  {en.brand.email}
                </a>
              </Row>
              <Row label="Address">
                <span>
                  {en.brand.addressLine1}
                  <br />
                  {en.brand.addressLine2}
                </span>
              </Row>
              <Row label="Hours">{en.brand.hours}</Row>
            </dl>
          </div>
          <div>
            <h2 className="font-display text-2xl uppercase tracking-[1.5px] mb-6">
              Send a message
            </h2>
            <ContactForm />
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="border-t border-border bg-brand-soft px-6 md:px-10 py-16 md:py-24 scroll-mt-20"
      >
        <div className="max-w-[820px] mx-auto">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-brand-deep mb-4">
            Frequently asked
          </p>
          <h2 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] mb-10">
            Questions, answered
          </h2>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>
    </SiteShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-4 items-start">
      <dt className="font-display text-xs tracking-[0.2em] uppercase text-muted-foreground pt-1">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
