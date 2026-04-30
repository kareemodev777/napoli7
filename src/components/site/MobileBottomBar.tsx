"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { formatAed } from "@/components/catalog/PriceBadge";

const SUPPRESSED_PREFIXES = [
  "/cart",
  "/checkout",
  "/order",
  "/login",
  "/register",
];

function isSuppressed(pathname: string): boolean {
  return SUPPRESSED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function MobileBottomBar() {
  const pathname = usePathname();
  const totalQty = useCart((s) => s.totalQuantity());
  const subtotal = useCart((s) => s.subtotal());
  const mounted = useMounted();

  if (isSuppressed(pathname)) return null;

  // Guard cart values behind `mounted` to avoid hydration mismatch.
  const qty = mounted ? totalQty : 0;
  const amount = mounted ? subtotal : 0;

  return (
    <div
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border flex"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      {/* Order CTA — arrow-btn variant at 52px height */}
      <Link
        href="/menu"
        className="arrow-btn flex-1"
        style={{ height: "52px", fontSize: "1.125rem" }}
        aria-label="Go to menu to order"
      >
        order
      </Link>

      {/* Cart pill */}
      <Link
        href="/cart"
        className="inline-flex items-center justify-center gap-2 w-[88px] h-[52px] border-l border-border hover:bg-muted transition-colors"
        aria-label={
          qty > 0
            ? `Cart — ${qty} item${qty === 1 ? "" : "s"}, ${formatAed(amount)}`
            : "Cart — empty"
        }
      >
        <div className="relative">
          <ShoppingBag className="h-5 w-5" strokeWidth={1.5} aria-hidden />
          {qty > 0 ? (
            <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] inline-flex items-center justify-center bg-brand text-primary-foreground text-[9px] font-display tabular-nums px-0.5">
              {qty}
            </span>
          ) : null}
        </div>
        {qty > 0 ? (
          <span className="font-display text-[11px] tabular-nums leading-none">
            {formatAed(amount)}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
