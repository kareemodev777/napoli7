"use client";

import { useEffect, useRef, useState } from "react";
import {
  SALES_RANGES,
  type SalesRange,
  type SalesSeries,
} from "@/lib/admin/sales";

const CHART_H = 240;

function money(n: number): string {
  return n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}

/**
 * Full-width sales chart with a Week / Month / Year filter. Server-rendered with
 * an initial series; switching the range refetches from /api/admin/sales. Bars
 * are plain elements (no chart dependency) to keep the sharp Napoli 7 look.
 */
export function SalesChart({ initial }: { initial: SalesSeries }) {
  const [range, setRange] = useState<SalesRange>(initial.range);
  const [series, setSeries] = useState<SalesSeries>(initial);
  const [loading, setLoading] = useState(false);
  // Cache fetched ranges so toggling back is instant.
  const cache = useRef<Map<SalesRange, SalesSeries>>(
    new Map([[initial.range, initial]]),
  );

  useEffect(() => {
    const cached = cache.current.get(range);
    if (cached) {
      setSeries(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/sales?range=${range}`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: SalesSeries) => {
        if (cancelled) return;
        cache.current.set(range, data);
        setSeries(data);
      })
      .catch(() => {
        // Keep the last series on failure; the range button stays selectable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const max = Math.max(0, ...series.buckets.map((b) => b.revenue));
  const hasSales = series.totalRevenue > 0;
  // For the dense month view, thin the axis labels so they don't collide.
  const labelStep = series.buckets.length > 14 ? 5 : 1;

  return (
    <article className="rounded-md border border-border bg-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Sales
          </p>
          <p className="mt-2 font-display text-3xl leading-none tabular-nums">
            {money(series.totalRevenue)}
            <span className="ml-1.5 text-base text-muted-foreground">AED</span>
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {series.totalOrders} paid order
            {series.totalOrders === 1 ? "" : "s"} this {range}. Cash and paid
            only.
          </p>
        </div>

        {/* Range filter — sharp segmented control. */}
        <div
          role="tablist"
          aria-label="Sales range"
          className="inline-flex shrink-0 rounded-md border border-border p-0.5"
        >
          {SALES_RANGES.map((r) => {
            const active = r.value === range;
            return (
              <button
                key={r.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRange(r.value)}
                className={`rounded-[2px] px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "bg-brand text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`relative mt-8 transition-opacity ${loading ? "opacity-50" : ""}`}
        style={{ height: CHART_H }}
      >
        {/* Horizontal guide lines + the peak value marker. */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-t border-border/60" />
          ))}
          <div className="border-t border-border" />
        </div>
        {hasSales ? (
          <span className="pointer-events-none absolute -top-3 right-0 font-display text-[10px] tabular-nums text-muted-foreground">
            {money(max)} AED
          </span>
        ) : null}

        {hasSales ? (
          <div className="absolute inset-0 flex items-end gap-[3px]">
            {series.buckets.map((b) => {
              const pct = max > 0 ? (b.revenue / max) * 100 : 0;
              return (
                <div
                  key={b.key}
                  className="group relative flex h-full flex-1 items-end"
                >
                  <div
                    className={`w-full transition-colors ${
                      b.revenue > 0
                        ? "bg-brand group-hover:bg-brand-hover"
                        : "bg-transparent"
                    }`}
                    style={{ height: `${pct}%`, minHeight: b.revenue > 0 ? 2 : 0 }}
                    aria-label={`${b.labelFull}: ${money(b.revenue)} AED, ${b.orders} orders`}
                  />
                  {/* Hover tooltip. */}
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-center shadow-md group-hover:block">
                    <span className="block font-display text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      {b.labelFull}
                    </span>
                    <span className="block font-display text-xs tabular-nums">
                      {money(b.revenue)} AED
                    </span>
                    <span className="block text-[10px] text-muted-foreground tabular-nums">
                      {b.orders} order{b.orders === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No sales in this {range} yet.
            </p>
          </div>
        )}
      </div>

      {/* X axis labels, aligned to the bars. */}
      <div className="mt-2 flex gap-[3px]">
        {series.buckets.map((b, i) => (
          <span
            key={b.key}
            className="flex-1 text-center font-display text-[10px] uppercase tracking-[0.08em] tabular-nums text-muted-foreground"
          >
            {i % labelStep === 0 || i === series.buckets.length - 1 ? b.label : ""}
          </span>
        ))}
      </div>
    </article>
  );
}
