import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { addAddress, deleteAddress, makeDefaultAddress } from "./actions";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Saved delivery addresses for your Napoli 7 account.",
  alternates: { canonical: "/account/addresses" },
  robots: { index: false, follow: false },
};

interface SavedAddress {
  id: string;
  label: string;
  street: string;
  area: string;
  flat: string | null;
  notes: string | null;
  isDefault: boolean;
}

async function loadAddresses(userId: string): Promise<SavedAddress[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_addresses")
    .select("id, label, street, area, flat, notes, is_default, created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.label,
    street: row.street,
    area: row.area,
    flat: row.flat,
    notes: row.notes,
    isDefault: Boolean(row.is_default),
  }));
}

export default async function AccountAddressesPage() {
  const user = await requireCustomerAccount("/account/addresses");
  const addresses = await loadAddresses(user.id);

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account/addresses" />
          <div>
            <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep mb-3">
              Account
            </p>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Saved addresses
            </h1>
            <p className="mt-4 text-base text-muted-foreground max-w-[65ch] leading-relaxed">
              Save delivery details so checkout is faster next time.
            </p>

            <div className="mt-10 grid gap-8 xl:grid-cols-[1fr_360px]">
              <section aria-label="Saved delivery addresses">
                {addresses.length === 0 ? (
                  <div className="border border-border bg-card p-8">
                    <h2 className="font-display text-sm uppercase tracking-[0.2em]">
                      No saved addresses yet
                    </h2>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                      Add your home, office, or favorite delivery location.
                    </p>
                  </div>
                ) : (
                  <ul className="grid gap-4">
                    {addresses.map((address) => (
                      <li key={address.id} className="border border-border bg-card p-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="font-display text-sm uppercase tracking-[0.2em]">
                                {address.label}
                              </h2>
                              {address.isDefault ? (
                                <span className="bg-brand text-primary-foreground px-2 py-1 font-display text-[10px] uppercase tracking-[0.16em]">
                                  Default
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm leading-relaxed">
                              {address.street}
                              {address.flat ? `, ${address.flat}` : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">{address.area}</p>
                            {address.notes ? (
                              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                                {address.notes}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {!address.isDefault ? (
                              <form action={makeDefaultAddress}>
                                <input type="hidden" name="id" value={address.id} />
                                <button
                                  type="submit"
                                  className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] hover:bg-muted"
                                >
                                  Make default
                                </button>
                              </form>
                            ) : null}
                            <form action={deleteAddress}>
                              <input type="hidden" name="id" value={address.id} />
                              <button
                                type="submit"
                                className="border border-border px-3 py-2 font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:bg-muted hover:text-foreground"
                              >
                                Delete
                              </button>
                            </form>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <form action={addAddress} className="border border-border bg-card p-6 space-y-4 h-fit">
                <h2 className="font-display text-sm uppercase tracking-[0.2em]">
                  Add address
                </h2>
                <label className="block text-sm">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Label
                  </span>
                  <input
                    name="label"
                    required
                    defaultValue="Home"
                    className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Street / building
                  </span>
                  <input
                    name="street"
                    required
                    className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Area
                  </span>
                  <input
                    name="area"
                    required
                    className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Flat / villa
                  </span>
                  <input
                    name="flat"
                    className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-display text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    Driver notes
                  </span>
                  <textarea
                    name="notes"
                    rows={3}
                    className="mt-2 w-full border border-border bg-background px-3 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
                <label className="flex items-center gap-3 text-sm text-muted-foreground">
                  <input name="isDefault" type="checkbox" className="h-4 w-4 accent-brand" />
                  Use as default delivery address
                </label>
                <button
                  type="submit"
                  className="w-full bg-brand text-primary-foreground px-5 py-3 font-display text-xs uppercase tracking-[0.2em] hover:bg-brand-hover"
                >
                  Save address
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
