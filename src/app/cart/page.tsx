import type { Metadata } from "next";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review your Napoli 7 order before checkout.",
  alternates: { canonical: "/cart" },
};

export default function CartPage() {
  return (
    <SiteShell>
      <PageHero eyebrow="Order" heading="Your cart" />
      <section className="px-6 md:px-10 py-12">
        <div className="max-w-[1140px] mx-auto">
          <CartView />
        </div>
      </section>
    </SiteShell>
  );
}
