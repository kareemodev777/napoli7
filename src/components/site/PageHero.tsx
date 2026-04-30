import type { ReactNode } from "react";

interface PageHeroProps {
  eyebrow?: string;
  heading: string;
  intro?: string;
  align?: "left" | "center";
  children?: ReactNode;
}

export function PageHero({
  eyebrow,
  heading,
  intro,
  align = "left",
  children,
}: PageHeroProps) {
  return (
    <section
      className={
        "border-b border-border bg-background py-16 md:py-24 px-6 md:px-10 " +
        (align === "center" ? "text-center" : "")
      }
    >
      <div
        className={"max-w-[1140px] mx-auto " + (align === "center" ? "" : "")}
      >
        {eyebrow ? (
          <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-4">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-medium tracking-[1.5px] uppercase leading-[0.95]">
          {heading}
        </h1>
        {intro ? (
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-[60ch] leading-relaxed">
            {intro}
          </p>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </section>
  );
}
