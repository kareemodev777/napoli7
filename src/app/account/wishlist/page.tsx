import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { requireAuth } from "@/lib/auth/require-auth";

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Saved products in your Napoli 7 wishlist.",
  alternates: { canonical: "/account/wishlist" },
  robots: { index: false, follow: false },
};

export default async function AccountWishlistPage() {
  await requireAuth("/account/wishlist");
  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account/wishlist" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Wishlist
            </h1>
            <p className="mt-6 text-base text-muted-foreground max-w-[55ch] leading-relaxed">
              Nothing saved yet. Browse the menu to add favourites.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
