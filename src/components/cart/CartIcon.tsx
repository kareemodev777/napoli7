"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";

export function CartIcon() {
  const totalQuantity = useCart((s) => s.totalQuantity());
  const mounted = useMounted();
  const count = mounted ? totalQuantity : 0;

  return (
    <Link
      href="/cart"
      className="relative flex items-center gap-2 hover:opacity-60"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={1.5} />
      {count > 0 ? (
        <span className="absolute -top-2 -right-3 min-w-[18px] h-[18px] inline-flex items-center justify-center bg-brand text-primary-foreground text-[10px] font-display tabular-nums px-1">
          {count}
        </span>
      ) : null}
      <span className="hidden sm:inline">order</span>
    </Link>
  );
}
