import Image from "next/image";

/**
 * Branded full-area loading state: the Napoli 7 mark inside a spinning ring.
 * Pure CSS animation (no client JS) so it works as a Suspense/route loading
 * boundary. `className` lets callers set the height (e.g. min-h-screen at the
 * root, the default within a layout that already shows chrome).
 */
export function BrandLoader({
  label = "Loading…",
  className = "min-h-[60vh]",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full items-center justify-center px-6 py-16 ${className}`}
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative h-16 w-16">
          <span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-border"
          />
          <span
            aria-hidden
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand"
          />
          <Image
            src="/logo.png"
            alt=""
            width={48}
            height={48}
            priority
            className="absolute inset-2 h-12 w-12 select-none"
          />
        </div>
        <p className="font-display text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}
