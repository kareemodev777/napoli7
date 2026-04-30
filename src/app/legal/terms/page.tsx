import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { LegalDocument } from "@/components/site/LegalDocument";
import { TERMS_AND_CONDITIONS } from "@/data/legal/terms";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms that apply when you order from Napoli 7 — pricing, delivery, allergies, liability, and governing law.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <SiteShell>
      <LegalDocument
        title={TERMS_AND_CONDITIONS.title}
        lastUpdated={TERMS_AND_CONDITIONS.lastUpdated}
        sections={TERMS_AND_CONDITIONS.sections}
        current="terms"
      />
    </SiteShell>
  );
}
