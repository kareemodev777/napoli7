import { Header } from "./Header";
import { Footer } from "./Footer";
import { MobileBottomBar } from "./MobileBottomBar";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { MarketingPopup } from "@/components/marketing/MarketingPopup";
import { getMarketingPopupCached } from "@/lib/marketing-popup.server";

interface SiteShellProps {
  children: React.ReactNode;
}

export async function SiteShell({ children }: SiteShellProps) {
  // Storefront-only marketing popup (admin does not render SiteShell). The config
  // is cached and the popup no-ops when disabled, so this stays cheap.
  const popup = await getMarketingPopupCached();

  return (
    <>
      <Header />
      <main id="main" className="flex-1 bg-background text-foreground">
        {children}
      </main>
      <Footer />
      <MobileBottomBar />
      <CartDrawer />
      <MarketingPopup config={popup} />
    </>
  );
}
