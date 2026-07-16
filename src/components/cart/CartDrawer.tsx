"use client";

import { useEffect } from "react";
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
import { CartLineItem } from "./CartLineItem";
import { CartSummary } from "./CartSummary";
import { EmptyCart } from "./EmptyCart";

/**
 * Slide-in cart drawer, opened from the header/mobile cart buttons. Reuses the
 * same line items and summary as the /cart page. Mounted once in SiteShell so
 * it's available on every storefront page.
 */
export function CartDrawer() {
  const open = useCartDrawer((s) => s.open);
  const setOpen = useCartDrawer((s) => s.setOpen);
  const closeCart = useCartDrawer((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const hydrated = useMounted();
  const pathname = usePathname();

  // Close on navigation (e.g. "Proceed to checkout" or a product link inside the
  // drawer) so it never lingers over the page the customer just moved to.
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  const hasItems = hydrated && items.length > 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="w-full max-h-dvh gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border p-5">
          <SheetTitle className="font-display text-2xl uppercase tracking-[1.5px]">
            Your order
          </SheetTitle>
          <SheetDescription className="sr-only">
            Items currently in your cart.
          </SheetDescription>
        </SheetHeader>

        {!hasItems ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <EmptyCart />
          </div>
        ) : (
          <>
            {/* min-h-0 is what makes overflow-y-auto actually scroll: without it a
                flex child keeps its content's height and the summary below gets
                pushed off the bottom of the fixed drawer — unreachable on mobile. */}
            <ul className="min-h-0 flex-1 overflow-y-auto px-5">
              {items.map((item) => (
                <CartLineItem key={item.id} item={item} />
              ))}
            </ul>
            <div className="shrink-0">
              <CartSummary />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
