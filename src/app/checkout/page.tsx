import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getDeliveryZones, DEFAULT_DELIVERY_FEE } from "@/lib/checkout";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your Napoli 7 order — pickup or delivery.",
  alternates: { canonical: "/checkout" },
};

export default async function CheckoutPage() {
  const zones = await getDeliveryZones();
  return (
    <SiteShell>
      <PageHero
        eyebrow="Order"
        heading="Checkout"
        intro="A short form, then we begin."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-[1140px] mx-auto">
          <Suspense
            fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
          >
            <CheckoutForm zones={zones} defaultFee={DEFAULT_DELIVERY_FEE} />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
