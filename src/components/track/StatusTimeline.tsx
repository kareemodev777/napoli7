interface StatusTimelineProps {
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
}

const STEPS = [
  { id: "received", label: "Order received" },
  { id: "preparing", label: "Preparing" },
  { id: "out_for_delivery", label: "Out for delivery" },
  { id: "delivered", label: "Delivered" },
] as const;

export function StatusTimeline({ status }: StatusTimelineProps) {
  if (status === "cancelled") {
    return (
      <div className="border border-flag-red bg-background p-6 text-center">
        <p className="font-display text-xs tracking-[0.25em] uppercase text-flag-red">
          Cancelled
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          This order was cancelled. If this is unexpected please call us.
        </p>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.id === status);

  return (
    <ol role="list" className="grid grid-cols-1 sm:grid-cols-4 gap-px bg-border border border-border">
      {STEPS.map((step, i) => {
        const isPast = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <li
            key={step.id}
            role="listitem"
            aria-current={isActive ? "step" : undefined}
            className={
              "p-5 bg-background flex flex-col gap-2 " +
              (isActive
                ? "bg-brand text-primary-foreground"
                : isPast
                ? "bg-muted text-muted-foreground"
                : "bg-background text-muted-foreground")
            }
          >
            <span className="font-display tabular-nums text-xs tracking-[0.2em]">
              0{i + 1}
            </span>
            <span className="font-display text-sm tracking-[0.1em] uppercase">
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
