export function formatAed(amount: number): string {
  return `${amount.toFixed(2)} AED`;
}

export function PriceBadge({
  amount,
  size = "md",
  className,
}: {
  amount: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeCls =
    size === "lg" ? "text-[22px]" : size === "sm" ? "text-sm" : "text-base";
  return (
    <span
      className={
        "tabular-nums font-display tracking-tight " +
        sizeCls +
        " " +
        (className ?? "")
      }
    >
      {formatAed(amount)}
    </span>
  );
}
