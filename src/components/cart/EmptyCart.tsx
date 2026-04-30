import Link from "next/link";

export function EmptyCart() {
  return (
    <div className="border border-border bg-card p-12 md:p-16 text-center">
      <p className="font-display text-xs tracking-[0.25em] uppercase text-muted-foreground mb-6">
        Your cart
      </p>
      <h2 className="font-display text-2xl md:text-3xl uppercase tracking-[1.5px] leading-tight">
        No items yet. Order your first pizza.
      </h2>
      <Link
        href="/menu"
        className="mt-8 inline-flex items-center bg-brand text-primary-foreground px-8 py-4 font-display text-sm tracking-[0.2em] uppercase hover:bg-brand-hover"
      >
        View menu
      </Link>
    </div>
  );
}
