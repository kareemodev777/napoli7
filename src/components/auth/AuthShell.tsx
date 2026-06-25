import type { ReactNode } from "react";
import { SiteShell } from "@/components/site/SiteShell";

/**
 * Shared chrome for the auth pages (login, register, …). Centers a single
 * max-w-md card within the main area so short forms sit balanced instead of
 * stranded at the top, while taller forms flow naturally from the top and
 * scroll only when they exceed the viewport.
 */
export function AuthShell({
  eyebrow = "Account",
  heading,
  intro,
  children,
}: {
  eyebrow?: string;
  heading: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <SiteShell>
      <section className="flex min-h-full items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <header className="text-center">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-azure-deep">
              {eyebrow}
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              {heading}
            </h1>
            {intro ? (
              <p className="mt-2 text-sm text-muted-foreground">{intro}</p>
            ) : null}
          </header>
          <div className="mt-8 rounded-md border border-border bg-card p-6 md:p-8">
            {children}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
