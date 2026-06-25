import type { DashBucket } from "@/lib/admin/dashboard";

const CHART_H = 260;

function money(n: number): string {
  return n.toLocaleString("en-AE", { maximumFractionDigits: 0 });
}

/**
 * Full-width revenue bars for the selected period. Server-rendered; the hover
 * tooltip is pure CSS so no client JS is needed. Axis labels thin out
 * automatically when there are many buckets.
 */
export function DashboardChart({
  buckets,
  totalRevenue,
}: {
  buckets: DashBucket[];
  totalRevenue: number;
}) {
  const max = Math.max(0, ...buckets.map((b) => b.revenue));
  const hasSales = totalRevenue > 0;
  const step = Math.max(1, Math.ceil(buckets.length / 12));

  return (
    <div>
      <div className="relative" style={{ height: CHART_H }}>
        {/* Guide lines + peak marker. */}
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
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {buckets.map((b) => {
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
            <p className="text-sm text-muted-foreground">No sales in this period yet.</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-[2px]">
        {buckets.map((b, i) => (
          <span
            key={b.key}
            className="flex-1 overflow-hidden text-center font-display text-[10px] uppercase tracking-[0.06em] tabular-nums text-muted-foreground"
          >
            {i % step === 0 || i === buckets.length - 1 ? b.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
