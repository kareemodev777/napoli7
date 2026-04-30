export default function Loading() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center px-6 py-24">
      <p
        role="status"
        aria-live="polite"
        className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground"
      >
        Loading…
      </p>
    </div>
  );
}
