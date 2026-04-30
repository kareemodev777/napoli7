import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { TrackForm } from "@/components/track/TrackForm";

export const metadata: Metadata = {
  title: "Track Order",
  description:
    "Track the status of a Napoli 7 order — enter your order number and phone.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Status"
        heading="Track order"
        intro="Enter the order number from your confirmation email and the phone number you used."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-[800px] mx-auto">
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
          >
            <TrackForm />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
