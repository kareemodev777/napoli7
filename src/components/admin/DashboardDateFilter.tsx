"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { DASHBOARD_RANGES, type DashboardRange } from "@/lib/admin/dashboard";

/**
 * Global date-range filter for the dashboard. Writes the choice to the `range`
 * URL param so the server re-renders every metric for that period (shareable,
 * back-button friendly). Shows a pending state while the route transitions.
 */
export function DashboardDateFilter({ current }: { current: DashboardRange }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  function select(range: DashboardRange) {
    if (range === current) return;
    const next = new URLSearchParams(params);
    next.set("range", range);
    startTransition(() => router.push(`/admin?${next.toString()}`));
  }

  return (
    <div
      role="tablist"
      aria-label="Date range"
      className={`inline-flex overflow-x-auto rounded-md border border-border p-0.5 ${
        pending ? "opacity-60" : ""
      }`}
    >
      {DASHBOARD_RANGES.map((r) => {
        const active = r.value === current;
        return (
          <button
            key={r.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(r.value)}
            className={`whitespace-nowrap rounded-[2px] px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.12em] transition-colors ${
              active
                ? "bg-brand text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {r.short}
          </button>
        );
      })}
    </div>
  );
}
