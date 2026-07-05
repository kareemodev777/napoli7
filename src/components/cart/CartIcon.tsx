"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useCartDrawer } from "@/store/cart-drawer";
import { useMounted } from "@/lib/use-mounted";

export function CartIcon() {
  const totalQuantity = useCart((s) => s.totalQuantity());
  const openCart = useCartDrawer((s) => s.openCart);
  const mounted = useMounted();
  const count = mounted ? totalQuantity : 0;

  return (
    <button
      type="button"
      onClick={openCart}
      className="hidden lg:inline-flex relative flex-col items-center justify-center gap-1 hover:opacity-60 min-w-[48px]"
      aria-label={`Open cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
      {count > 0 ? (
        <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] inline-flex items-center justify-center bg-brand text-primary-foreground text-[10px] font-display tabular-nums px-1">
          {count}
        </span>
      ) : null}
      <span className="text-[10px] tracking-[0.2em] uppercase leading-none">
        Cart
      </span>
    </button>
  );
}
