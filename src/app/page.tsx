import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { EditorialGrid } from "@/components/site/EditorialGrid";
import { LocationBanner } from "@/components/site/LocationBanner";
import { Footer } from "@/components/site/Footer";
import { MobileBottomBar } from "@/components/site/MobileBottomBar";
import { CookieBar } from "@/components/site/CookieBar";
import { LocalBusinessJsonLd } from "@/components/structured-data/LocalBusiness";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <LocalBusinessJsonLd />
      <Header />
      <main id="main" className="flex-1 bg-background text-foreground">
        <Hero />
        <EditorialGrid />
        <LocationBanner />
      </main>
      <Footer />
      <MobileBottomBar />
      <CookieBar />
    </>
  );
}
