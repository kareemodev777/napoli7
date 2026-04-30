"use client";

import type { ProductSize, SizeId } from "@/data/types/catalog";

interface SizeSelectorProps {
  sizes: ProductSize[];
  value: SizeId;
  onChange: (id: SizeId) => void;
  size?: "sm" | "md";
}

export function SizeSelector({
  sizes,
  value,
  onChange,
  size = "sm",
}: SizeSelectorProps) {
  if (sizes.length <= 1) return null;
  const padding = size === "md" ? "px-4 py-3" : "px-3 py-2";
  return (
    <div
      role="radiogroup"
      aria-label="Size"
      className="inline-flex border border-border bg-background"
    >
      {sizes.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(s.id)}
            className={
              padding +
              " font-display text-[11px] tracking-[0.18em] uppercase border-r border-border last:border-r-0 leading-tight " +
              (active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            <span className="block">{s.label}</span>
            {s.detail ? (
              <span
                className={
                  "block text-[9px] tracking-[0.15em] mt-0.5 " +
                  (active ? "text-background/70" : "text-muted-foreground/70")
                }
              >
                {s.detail}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
