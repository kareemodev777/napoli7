import type { Metadata } from "next";
import { MarketingPopupForm } from "./MarketingPopupForm";
import { getMarketingPopup } from "@/lib/marketing-popup.server";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";

export const metadata: Metadata = {
  title: "Marketing popup · Admin",
  alternates: { canonical: "/admin/marketing-popup" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminMarketingPopupPage() {
  const config = await getMarketingPopup();

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
            Marketing popup
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
            A modal that greets visitors on the storefront — an image, an optional
            message, and a button. It appears once per browser session, opening
            immediately or after a delay you set, and re-appears when you change
            its content. Changes go live immediately after saving.
          </p>
        </div>

        {HAS_SUPABASE_SERVICE ? (
          <MarketingPopupForm config={config} />
        ) : (
          <div className="mt-6 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to edit the popup.
          </div>
        )}
      </div>
    </section>
  );
}
