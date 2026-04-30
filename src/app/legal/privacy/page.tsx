import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { LegalDocument } from "@/components/site/LegalDocument";
import { PRIVACY_POLICY } from "@/data/legal/privacy";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Napoli 7 collects, uses, and protects your personal information when you order online.",
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  return (
    <SiteShell>
      <LegalDocument
        title={PRIVACY_POLICY.title}
        lastUpdated={PRIVACY_POLICY.lastUpdated}
        sections={PRIVACY_POLICY.sections}
        current="privacy"
      />
    </SiteShell>
  );
}
