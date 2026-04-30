import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-32 md:py-40">
        <div className="max-w-[640px] mx-auto text-center">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6">
            404
          </p>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-[1.5px] leading-tight">
            Page not found
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[55ch] mx-auto">
            The link you followed may be broken, or the page may have moved. Try
            the menu, or head back to the home page.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/menu"
              className="inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
            >
              View menu
            </Link>
            <Link
              href="/"
              className="inline-flex items-center border border-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
            >
              Go home
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
