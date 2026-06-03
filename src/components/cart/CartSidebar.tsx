"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Minus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { useCart, type CartItem } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { formatAed } from "@/components/catalog/PriceBadge";

const FREE_DELIVERY_TARGET = 100;

export function CartSidebar() {
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const totalQty = useCart((s) => s.totalQuantity());
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeItem = useCart((s) => s.removeItem);
  const mounted = useMounted();

  const hasItems = mounted && items.length > 0;
  const progress = mounted
    ? Math.min(100, (subtotal / FREE_DELIVERY_TARGET) * 100)
    : 0;
  const remaining = Math.max(0, FREE_DELIVERY_TARGET - subtotal);

  return (
    <aside
      aria-label="Shopping cart"
      className="bg-background border border-border flex flex-col h-[calc(100vh-160px)] sticky top-6 max-w-full"
    >
      <header className="px-5 pt-5 pb-4 border-b border-border">
        <p className="font-display text-[10px] tracking-[0.25em] uppercase text-foreground">
          Your order
        </p>
        <h2 className="mt-1 font-display text-2xl uppercase tracking-[1.5px] leading-tight">
          Shopping cart
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Pickup or delivery · Al Jurf 2, Ajman
        </p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!hasItems ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <CartRow
                key={item.id}
                item={item}
                onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
                onDecrement={() =>
                  updateQuantity(item.id, Math.max(0, item.quantity - 1))
                }
                onRemove={() => removeItem(item.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border px-5 pt-4 pb-5 space-y-4">
        {hasItems ? (
          <div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">
                {remaining > 0
                  ? `Add ${formatAed(remaining)} for free delivery`
                  : "Free delivery unlocked"}
              </span>
              <span className="font-display tabular-nums">
                {formatAed(subtotal)} / {formatAed(FREE_DELIVERY_TARGET)}
              </span>
            </div>
            <div className="mt-2 h-1 bg-border overflow-hidden">
              <div
                className="h-full bg-brand transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        ) : null}

        <dl className="text-sm space-y-2">
          <Row
            label={`Subtotal · ${totalQty} item${totalQty === 1 ? "" : "s"}`}
          >
            {formatAed(subtotal)}
          </Row>
          <Row label="Delivery fee">Calculated at checkout</Row>
        </dl>

        <Link
          href="/checkout"
          aria-disabled={!hasItems}
          tabIndex={hasItems ? 0 : -1}
          onClick={(e) => {
            if (!hasItems) e.preventDefault();
          }}
          className={
            "inline-flex w-full items-center justify-between gap-3 px-5 py-4 font-display text-sm tracking-[0.2em] uppercase " +
            (hasItems
              ? "bg-brand text-primary-foreground hover:bg-brand-hover"
              : "bg-muted text-muted-foreground cursor-not-allowed")
          }
        >
          <span>Checkout</span>
          <span className="flex items-center gap-2 tabular-nums">
            {formatAed(subtotal)}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
        </Link>
      </footer>
    </aside>
  );
}

function EmptyState() {
  return (
    <div className="px-5 py-10 text-center">
      <div className="mx-auto h-12 w-12 inline-flex items-center justify-center border border-border text-muted-foreground">
        <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="mt-4 font-display text-sm tracking-[0.1em] uppercase">
        Your cart is empty
      </p>
      <p className="mt-2 text-xs text-muted-foreground leading-relaxed max-w-[28ch] mx-auto">
        Pick a pizza on the left to start your order.
      </p>
    </div>
  );
}

function CartRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: {
  item: CartItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}) {
  const customSummary = item.customizations
    .map((c) => {
      const action =
        c.choice === "extra"
          ? "Extra"
          : c.choice === "without"
            ? "Without"
            : "";
      return `${action} ${c.ingredient}`.trim();
    })
    .join(" · ");

  return (
    <li className="grid grid-cols-[56px_1fr_auto] gap-3 p-4">
      <div className="relative aspect-square bg-muted overflow-hidden">
        <Image
          src={item.imageUrl}
          alt={item.name}
          fill
          sizes="56px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="font-display text-sm font-medium leading-tight truncate">
          {item.name}
        </p>
        <p className="text-[11px] text-muted-foreground tracking-[0.05em] mt-0.5">
          {item.sizeLabel}
          {item.sizeDetail ? ` · ${item.sizeDetail}` : ""}
        </p>
        {customSummary ? (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-1">
            {customSummary}
          </p>
        ) : null}
        <div className="mt-2 inline-flex items-center border border-border">
          <button
            type="button"
            aria-label={item.quantity > 1 ? "Decrease quantity" : "Remove item"}
            onClick={onDecrement}
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted"
          >
            <Minus className="h-3 w-3" strokeWidth={1.5} aria-hidden />
          </button>
          <span
            aria-live="polite"
            className="min-w-7 text-center text-xs font-display tabular-nums"
          >
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={onIncrement}
            disabled={item.quantity >= 20}
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted disabled:opacity-30"
          >
            <Plus className="h-3 w-3" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between gap-1">
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
        </button>
        <span className="font-display text-sm tabular-nums">
          {formatAed(item.unitPrice * item.quantity)}
        </span>
      </div>
    </li>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}
