import type { Metadata } from "next";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { HomeStory } from "@/components/site/HomeStory";
import { LocationBanner } from "@/components/site/LocationBanner";
import { Footer } from "@/components/site/Footer";
import { MobileBottomBar } from "@/components/site/MobileBottomBar";
import { CookieBar } from "@/components/site/CookieBar";
import { LocalBusinessJsonLd } from "@/components/structured-data/LocalBusiness";
import { getDeliveryZones } from "@/lib/checkout";
import { getSiteImages } from "@/lib/site-images";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [images, deliveryZones] = await Promise.all([
    getSiteImages(),
    getDeliveryZones(),
  ]);
  return (
    <>
      <LocalBusinessJsonLd />
      <Header />
      <main id="main" className="flex-1 bg-background text-foreground">
        <Hero image={images.home_hero} deliveryZones={deliveryZones} />
        <HomeStory images={images} />
        <LocationBanner />
      </main>
      <Footer />
      <MobileBottomBar />
      <CookieBar />
    </>
  );
}
