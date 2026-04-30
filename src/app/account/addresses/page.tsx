import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { requireAuth } from "@/lib/auth/require-auth";

export const metadata: Metadata = {
  title: "Addresses",
  description: "Saved delivery addresses for your Napoli 7 account.",
  alternates: { canonical: "/account/addresses" },
  robots: { index: false, follow: false },
};

export default async function AccountAddressesPage() {
  await requireAuth("/account/addresses");
  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account/addresses" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Saved addresses
            </h1>
            <p className="mt-6 text-base text-muted-foreground max-w-[55ch] leading-relaxed">
              Address management activates once Supabase Auth is wired. The
              schema is in{" "}
              <code className="font-mono text-sm">
                supabase/migrations/002_auth_and_accounts.sql
              </code>
              .
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
