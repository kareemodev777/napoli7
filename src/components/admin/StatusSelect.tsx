"use client";

import { useTransition } from "react";
import { updateOrderStatus } from "@/app/admin/orders/actions";

const OPTIONS = [
  { value: "received", label: "Received" },
  { value: "preparing", label: "Preparing" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function StatusSelect({
  orderId,
  current,
}: {
  orderId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={current}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value;
        startTransition(async () => {
          const fd = new FormData();
          fd.set("orderId", orderId);
          fd.set("status", status);
          await updateOrderStatus(fd);
        });
      }}
      className="border border-border bg-background px-3 py-2 text-xs font-display tracking-[0.1em] uppercase focus:outline-none focus:border-brand"
    >
      {OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
