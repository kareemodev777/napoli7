import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getDeliveryZones, DEFAULT_DELIVERY_FEE } from "@/lib/checkout";
import { HAS_SUPABASE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildCheckoutInitialDetails,
  type CheckoutInitialAddress,
  type CheckoutInitialDetails,
} from "@/lib/checkout-prefill";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your Napoli 7 order — pickup or delivery.",
  alternates: { canonical: "/checkout" },
};

async function loadCheckoutInitialDetails(): Promise<CheckoutInitialDetails> {
  if (!HAS_SUPABASE) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return {};

  const { data: address } = await supabase
    .from("saved_addresses")
    .select("street, area, flat, notes")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return buildCheckoutInitialDetails({
    email: user.email,
    metadata: user.user_metadata,
    address: address
      ? ({
          street: address.street,
          area: address.area,
          flat: address.flat ?? undefined,
          notes: address.notes ?? undefined,
        } satisfies CheckoutInitialAddress)
      : null,
  });
}

export default async function CheckoutPage() {
  const [zones, initialDetails] = await Promise.all([
    getDeliveryZones(),
    loadCheckoutInitialDetails(),
  ]);

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
            <CheckoutForm
              zones={zones}
              defaultFee={DEFAULT_DELIVERY_FEE}
              initialDetails={initialDetails}
            />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
