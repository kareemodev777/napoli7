import { Flame } from "lucide-react";

export function SpicyDot() {
  return (
    <span
      role="img"
      aria-label="Spicy — contains chilli"
      className="inline-flex items-center gap-1 rounded-full bg-flag-red px-2 py-0.5 text-white shadow-sm"
    >
      <Flame className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
      <span className="font-display text-[9px] font-medium uppercase tracking-[0.12em]">
        Spicy
      </span>
    </span>
  );
}
