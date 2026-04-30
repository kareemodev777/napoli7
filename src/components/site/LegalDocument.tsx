import { LegalNav } from "./LegalNav";
import { PageHero } from "./PageHero";

interface LegalSection {
  heading: string;
  body: string;
}

interface LegalDocumentProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  current: "privacy" | "terms" | "refund";
}

export function LegalDocument({ title, lastUpdated, sections, current }: LegalDocumentProps) {
  return (
    <>
      <PageHero eyebrow="Legal" heading={title}>
        <LegalNav current={current} />
      </PageHero>
      <section className="px-6 md:px-10 py-16 md:py-24">
        <div className="max-w-[720px] mx-auto">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-12">
            Last updated {lastUpdated}
          </p>
          <div className="space-y-10">
            {sections.map((s) => (
              <article key={s.heading}>
                <h2 className="font-display text-xl md:text-2xl font-medium leading-tight mb-3">
                  {s.heading}
                </h2>
                <p className="text-base text-muted-foreground leading-relaxed max-w-[65ch]">
                  {s.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
