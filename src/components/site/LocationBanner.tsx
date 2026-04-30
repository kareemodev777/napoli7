import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LocationBanner() {
  return (
    <section className="bg-secondary">
      <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
        <div className="relative aspect-[4/3] md:aspect-square w-full max-w-md mx-auto md:max-w-none">
          <Image
            src="/images/location-block.jpg"
            alt="Napoli 7 storefront, Al Jurf 2, Ajman"
            fill
            sizes="(min-width: 768px) 50vw, 90vw"
            className="object-cover"
          />
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
            <p>213 Sheikh Rashid bin Abdul Aziz St</p>
            <p>Open daily, 11:00 – 22:00</p>
          </div>
          <Link
            href="/location"
            className="inline-flex items-center gap-2 font-display text-sm border-b border-foreground pb-1 hover:opacity-60"
          >
            Get directions
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </div>
    </section>
  );
}
