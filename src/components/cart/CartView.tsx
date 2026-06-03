"use client";

import { useCart } from "@/store/cart";
import { useMounted } from "@/lib/use-mounted";
import { CartLineItem } from "./CartLineItem";
import { CartSummary } from "./CartSummary";
import { EmptyCart } from "./EmptyCart";

export function CartView() {
  const items = useCart((s) => s.items);
  const hydrated = useMounted();

  if (!hydrated || items.length === 0) {
    return <EmptyCart />;
  }

  return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-10 items-start">
      <ul className="border-t border-border">
        {items.map((item) => (
          <CartLineItem key={item.id} item={item} />
        ))}
      </ul>
      <CartSummary />
    </div>
  );
}
