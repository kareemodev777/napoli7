import type { Metadata } from "next";
import { SiteImageForm } from "./SiteImageForm";
import { getSiteImages, SITE_IMAGE_FIELDS } from "@/lib/site-images";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";

export const metadata: Metadata = {
  title: "Site images · Admin",
  alternates: { canonical: "/admin/site-images" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminSiteImagesPage() {
  const images = await getSiteImages();

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1100px]">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
            Site images
          </h1>
          <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">
            Replace the marketing images on the home and about pages. Changes go
            live immediately after saving.
          </p>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-6 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to upload and save images.
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {SITE_IMAGE_FIELDS.map((field) => (
            <SiteImageForm
              key={field.key}
              imageKey={field.key}
              label={field.label}
              description={field.description}
              aspect={field.aspect}
              current={images[field.key]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
