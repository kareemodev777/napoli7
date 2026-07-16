import { Leaf } from "lucide-react";

export function VegDot() {
  return (
    <span
      role="img"
      aria-label="Vegetarian"
      className="inline-flex items-center gap-1 rounded-full bg-flag-green px-2 py-0.5 text-white shadow-sm"
    >
      <Leaf className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
      <span className="font-display text-[9px] font-medium uppercase tracking-[0.12em]">
        Veg
      </span>
    </span>
  );
}
