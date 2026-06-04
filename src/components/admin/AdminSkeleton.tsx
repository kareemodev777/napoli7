/**
 * Shared skeleton primitives for admin route `loading.tsx` boundaries. Rendered
 * instantly on navigation (App Router Suspense) so admins get immediate visual
 * feedback instead of a frozen page while server components stream in.
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className}`}
      aria-hidden
    />
  );
}

export function AdminPageSkeleton({
  rows = 6,
  title = "Loading…",
}: {
  rows?: number;
  title?: string;
}) {
  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <span className="sr-only" role="status">
          {title}
        </span>
        <SkeletonBar className="h-9 w-64" />
        <SkeletonBar className="mt-4 h-4 w-80" />

        <div className="mt-10 space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonBar key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}

export function AdminStatsSkeleton() {
  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <span className="sr-only" role="status">
          Loading dashboard…
        </span>
        <SkeletonBar className="h-9 w-72" />
        <SkeletonBar className="mt-4 h-4 w-96" />

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <SkeletonBar key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBar key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    </section>
  );
}
