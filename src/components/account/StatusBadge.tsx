type Status =
  | "received"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const LABELS: Record<Status, string> = {
  received: "Received",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const CLASSES: Record<Status, string> = {
  received: "bg-brand-soft text-brand-deep",
  preparing: "bg-azure-soft text-azure-deep",
  ready: "bg-azure text-primary-foreground",
  out_for_delivery: "bg-brand text-primary-foreground",
  delivered: "bg-flag-green/15 text-flag-green",
  cancelled: "bg-flag-red/10 text-flag-red",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={
        "inline-flex items-center px-2.5 py-1 font-display text-[10px] tracking-[0.2em] uppercase " +
        CLASSES[status]
      }
    >
      {LABELS[status]}
    </span>
  );
}
