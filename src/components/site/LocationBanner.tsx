import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MapEmbed } from "./MapEmbed";
import en from "@/i18n/en.json";

export function LocationBanner() {
  return (
    <section className="bg-secondary">
      <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="w-full">
          <MapEmbed query={en.brand.mapQuery} />
        </div>
        <div>
          <p className="font-display text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Visit us
          </p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05] mb-6 text-balance">
            Al Jurf 2.
            <br />
            <span className="italic font-medium">
              A short walk from anywhere in Ajman.
            </span>
          </h2>
          <div className="space-y-2 text-base leading-relaxed mb-8">
            <p>Shop 4, opposite Delta Supermarket</p>
            <p>213 Sheikh Rashid bin Abdul Aziz Street, Al Jurf 2, Ajman</p>
            <p>Open Tuesday to Sunday: 12:30 – 00:00</p>
          </div>
          <Link
            href="/location"
            className="inline-flex items-center gap-2 font-display text-sm border-b border-foreground pb-1 hover:opacity-60"
          >
            Location
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
