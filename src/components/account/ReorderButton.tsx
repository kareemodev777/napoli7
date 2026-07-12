"use client";

import { useRouter } from "next/navigation";
import { useCart, type CartItemInput } from "@/store/cart";

export function ReorderButton({
  items,
  changedCount = 0,
  unavailableCount = 0,
  disabled,
}: {
  items: CartItemInput[];
  changedCount?: number;
  unavailableCount?: number;
  disabled?: boolean;
}) {
  const addItem = useCart((state) => state.addItem);
  const clearPromos = useCart((state) => state.clearPromos);
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={disabled || items.length === 0}
      onClick={() => {
        clearPromos();
        items.forEach((item) => addItem(item));
        if (changedCount > 0 || unavailableCount > 0) {
          window.alert(
            [
              changedCount > 0
                ? `${changedCount} item${changedCount === 1 ? "" : "s"} had updated menu pricing/size and was added with today's menu details.`
                : null,
              unavailableCount > 0
                ? `${unavailableCount} item${unavailableCount === 1 ? "" : "s"} is no longer available and was not added.`
                : null,
            ]
              .filter(Boolean)
              .join("\n"),
          );
        }
        router.push("/cart");
      }}
      className="inline-flex items-center justify-center border border-foreground px-4 py-2 font-display text-[11px] tracking-[0.18em] uppercase hover:bg-foreground hover:text-background disabled:opacity-40 disabled:cursor-not-allowed"
    >
      Reorder
    </button>
  );
}
