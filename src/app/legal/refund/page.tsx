import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { LegalDocument } from "@/components/site/LegalDocument";
import { REFUND_POLICY } from "@/data/legal/refund";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Refund & Cancellation",
  description:
    "How to cancel an order, when refunds apply, and how late or unsatisfactory deliveries are handled.",
  alternates: { canonical: "/legal/refund" },
};

export default function RefundPage() {
  return (
    <SiteShell>
      <LegalDocument
        title={REFUND_POLICY.title}
        lastUpdated={REFUND_POLICY.lastUpdated}
        sections={REFUND_POLICY.sections}
        current="refund"
      />
    </SiteShell>
  );
}
