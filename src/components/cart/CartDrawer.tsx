"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/store/cart-drawer";
import { useMounted } from "@/lib/use-mounted";
import { useOrderingAvailability } from "@/lib/use-ordering-availability";
import { formatAed } from "@/components/catalog/PriceBadge";
import { CartLineItem } from "./CartLineItem";

/**
 * Slide-in cart drawer, opened from the header/mobile cart buttons. Mounted once
 * in SiteShell so it's available on every storefront page.
 *
 * The drawer is a compact mini-cart: a scrolling item list and a short footer with
 * the total and a checkout button. It deliberately does NOT reuse the full /cart
 * summary — that card, its fee breakdown and the promo field are page furniture,
 * and pinned in the drawer footer they eat a short mobile viewport and push the
 * checkout button off the bottom (unreachable). Fees and promo codes are settled on
 * the cart and checkout pages, one tap away.
 */
export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const setOpen = useCartDrawer((s) => s.setOpen);
  const closeCart = useCartDrawer((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const subtotal = useCart((s) => s.subtotal());
  const discount = useCart((s) => s.discount());
  const total = useCart((s) => s.total());
  const hydrated = useMounted();
  const pathname = usePathname();
  const { availability } = useOrderingAvailability();
  const orderingOpen = availability?.isOpen ?? true;

  // Close on navigation (e.g. "Checkout" or a product link inside the drawer) so it
  // never lingers over the page the customer just moved to.
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  const hasItems = hydrated && items.length > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full max-h-dvh flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border p-5 pr-16">
          <SheetTitle className="font-display text-xl uppercase tracking-[1.5px] sm:text-2xl">
            Your order
          </SheetTitle>
          <SheetDescription className="sr-only">
            Items currently in your cart.
          </SheetDescription>
        </SheetHeader>

        {!hasItems ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
            <div>
              <p className="font-display text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                Your cart
              </p>
              <h2 className="mt-3 font-display text-xl uppercase leading-tight tracking-[1.5px]">
                No items yet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Order your first pizza from the menu.
              </p>
            </div>
            <Link
              href="/menu"
              className="inline-flex min-h-[48px] items-center bg-brand px-8 py-3 font-display text-sm uppercase tracking-[0.2em] text-primary-foreground hover:bg-brand-hover"
            >
              View menu
            </Link>
          </div>
        ) : (
          <>
            {/* min-h-0 lets overflow-y-auto actually scroll inside the flex column;
                without it the list keeps its full content height and the footer is
                pushed off the bottom of the fixed drawer. */}
            <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </ul>

            <div className="shrink-0 space-y-4 border-t border-border bg-background p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="tabular-nums">{formatAed(subtotal)}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd className="tabular-nums">−{formatAed(discount)}</dd>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
                  <dt className="font-display text-xs uppercase tracking-[0.25em]">
                    Total
                  </dt>
                  <dd className="font-display text-lg tabular-nums">
                    {formatAed(total)}
                  </dd>
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                Delivery, fees and promo codes are applied at checkout.
              </p>

              {orderingOpen ? (
                <div className="space-y-2">
                  <Link
                    href="/checkout"
                    className="inline-flex min-h-[52px] w-full items-center justify-center bg-brand px-6 font-display text-sm uppercase tracking-[0.2em] text-primary-foreground hover:bg-brand-hover"
                  >
                    Checkout
                  </Link>
                  <Link
                    href="/cart"
                    className="inline-flex min-h-[48px] w-full items-center justify-center border border-foreground px-6 font-display text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
                  >
                    View cart
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
                    Ordering is paused right now. Check back when we reopen.
                  </div>
                  <Link
                    href="/location"
                    className="inline-flex min-h-[48px] w-full items-center justify-center border border-foreground px-6 font-display text-xs uppercase tracking-[0.2em] hover:bg-foreground hover:text-background"
                  >
                    See opening hours
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
