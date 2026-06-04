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
  type CheckoutInitialDetails,
} from "@/lib/checkout-prefill";
import type { CheckoutSavedAddress } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your Napoli 7 order — pickup or delivery.",
  alternates: { canonical: "/checkout" },
};

interface CheckoutAccountData {
  initialDetails: CheckoutInitialDetails;
  savedAddresses: CheckoutSavedAddress[];
}

async function loadCheckoutAccountData(): Promise<CheckoutAccountData> {
  if (!HAS_SUPABASE) return { initialDetails: {}, savedAddresses: [] };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { initialDetails: {}, savedAddresses: [] };

  // Load every saved address (default first) so the customer can pick one.
  const { data: rows } = await supabase
    .from("saved_addresses")
    .select("id, label, street, area, flat, notes, is_default")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  const savedAddresses: CheckoutSavedAddress[] = (rows ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    street: row.street,
    area: row.area,
    flat: row.flat ?? undefined,
    notes: row.notes ?? undefined,
    isDefault: Boolean(row.is_default),
  }));

  const defaultAddress = savedAddresses[0];

  return {
    initialDetails: buildCheckoutInitialDetails({
      email: user.email,
      metadata: user.user_metadata,
      address: defaultAddress
        ? {
            street: defaultAddress.street,
            area: defaultAddress.area,
            flat: defaultAddress.flat,
            notes: defaultAddress.notes,
          }
        : null,
    }),
    savedAddresses,
  };
}

export default async function CheckoutPage() {
  const [zones, accountData] = await Promise.all([
    getDeliveryZones(),
    loadCheckoutAccountData(),
  ]);
  const { initialDetails, savedAddresses } = accountData;

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
              savedAddresses={savedAddresses}
            />
          </Suspense>
        </div>
      </section>
    </SiteShell>
  );
}
