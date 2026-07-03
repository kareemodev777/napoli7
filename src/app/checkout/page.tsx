import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getDeliveryZones, DEFAULT_DELIVERY_FEE } from "@/lib/checkout";
import { getDeliveryMinimumSubtotalAed } from "@/lib/delivery-settings";
import { HAS_SUPABASE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  buildCheckoutInitialDetails,
  type CheckoutInitialDetails,
} from "@/lib/checkout-prefill";
import type { CheckoutSavedAddress } from "@/components/checkout/CheckoutForm";
import { getOrderingAvailability } from "@/lib/ordering-hours";
import { getCustomerAvailableRewardCode } from "@/lib/signup-reward";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Place your Napoli 7 order — pickup or delivery.",
  alternates: { canonical: "/checkout" },
};

interface CheckoutAccountData {
  initialDetails: CheckoutInitialDetails;
  savedAddresses: CheckoutSavedAddress[];
  /** The customer's still-usable signup reward code, auto-applied at checkout. */
  rewardCode: string | null;
}

async function loadCheckoutAccountData(): Promise<CheckoutAccountData> {
  if (!HAS_SUPABASE)
    return { initialDetails: {}, savedAddresses: [], rewardCode: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return { initialDetails: {}, savedAddresses: [], rewardCode: null };

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
  const rewardCode = await getCustomerAvailableRewardCode(user.id);

  return {
    rewardCode,
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

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string }>;
}) {
  const [
    { area },
    zones,
    accountData,
    orderingAvailability,
    deliveryMinSubtotalAed,
  ] = await Promise.all([
    searchParams,
    getDeliveryZones(),
    loadCheckoutAccountData(),
    getOrderingAvailability(),
    getDeliveryMinimumSubtotalAed(),
  ]);
  const { initialDetails, savedAddresses, rewardCode } = accountData;
  const preferredArea = area?.trim() || undefined;

  return (
    <SiteShell>
      <PageHero
        eyebrow="Order"
        heading="Checkout"
        intro="A short form, then we begin."
      />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-[1140px] mx-auto">
          {!orderingAvailability.isOpen ? (
            <div className="border border-border bg-muted p-6 md:p-8 space-y-4">
              <p className="font-display text-sm tracking-[0.25em] uppercase text-foreground">
                We’re closed right now
              </p>
              <p className="text-sm text-muted-foreground">
                {orderingAvailability.nextOpenLabel
                  ? `Orders open again at ${orderingAvailability.nextOpenLabel}.`
                  : "Please check back when we reopen."}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/location"
                  className="inline-flex items-center justify-center border border-foreground px-4 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
                >
                  See opening hours
                </Link>
                <Link
                  href="/menu"
                  className="inline-flex items-center justify-center bg-brand text-primary-foreground px-4 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-brand-hover"
                >
                  Browse the menu
                </Link>
              </div>
            </div>
          ) : (
            <Suspense
              fallback={<p className="text-sm text-muted-foreground">Loading…</p>}
            >
              <CheckoutForm
                zones={zones}
                defaultFee={DEFAULT_DELIVERY_FEE}
                deliveryMinSubtotalAed={deliveryMinSubtotalAed}
                initialDetails={initialDetails}
                savedAddresses={savedAddresses}
                preferredArea={preferredArea}
                rewardCode={rewardCode}
              />
            </Suspense>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
