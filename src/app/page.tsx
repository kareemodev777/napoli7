import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/site/SiteShell";
import { Hero } from "@/components/site/Hero";
import { HomeStory } from "@/components/site/HomeStory";
import { LocationBanner } from "@/components/site/LocationBanner";
import { CookieBar } from "@/components/site/CookieBar";
import { LocalBusinessJsonLd } from "@/components/structured-data/LocalBusiness";
import { getSiteImages } from "@/lib/site-images";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/change-password`);
  }

  const images = await getSiteImages();
  return (
    <>
      <LocalBusinessJsonLd />
      <SiteShell>
        <Hero image={images.home_hero} />
        <HomeStory images={images} />
        <LocationBanner />
      </SiteShell>
      <CookieBar />
    </>
  );
}
