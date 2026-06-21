"use client";

import { useState, useTransition } from "react";
import { assignRiderToOrder } from "@/app/admin/orders/actions";

export interface AssignableRider {
  id: string;
  name: string;
  phone: string;
}

/**
 * Assigns a rider to a delivery order. Changing the selection persists the
 * assignment and, when a rider is chosen, fires the WhatsApp brief to them. The
 * inline status confirms whether WhatsApp actually reached the rider so the
 * admin can fall back to a phone call when it didn't.
 */
export function AssignRiderForm({
  orderId,
  riders,
  currentRiderId,
}: {
  orderId: string;
  riders: AssignableRider[];
  currentRiderId: string | null;
}) {
  const [riderId, setRiderId] = useState<string>(currentRiderId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    const previous = riderId;
    setRiderId(next); // optimistic
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("orderId", orderId);
      fd.set("riderId", next);
      const result = await assignRiderToOrder(fd);
      if (result.error) {
        setRiderId(previous); // revert
        setIsError(true);
        setMessage(result.error);
        return;
      }
      if (!next) {
        setMessage("Rider unassigned.");
        return;
      }
      const who = result.riderName ?? "rider";
      if (result.whatsappSent) {
        setMessage(`Assigned to ${who} — WhatsApp brief sent.`);
        setIsError(false);
      } else {
        setIsError(true);
        setMessage(
          `Assigned to ${who}, but WhatsApp was not sent${
            result.whatsappReason ? ` (${result.whatsappReason})` : ""
          }. Notify them directly.`,
        );
      }
    });
  }

  if (riders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No active riders.{" "}
        <a
          href="/admin/riders"
          className="underline decoration-dotted underline-offset-4 hover:text-foreground"
        >
          Register a rider
        </a>{" "}
        to assign this delivery.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      <label
        htmlFor="assign-rider"
        className="font-display text-[11px] uppercase tracking-[0.14em] text-muted-foreground"
      >
        Assign rider
      </label>
      <select
        id="assign-rider"
        value={riderId}
        disabled={pending}
        onChange={handleChange}
        className="h-11 w-full max-w-sm border border-border bg-background px-3 text-sm focus:border-brand focus:outline-none disabled:opacity-50"
      >
        <option value="">— Unassigned —</option>
        {riders.map((rider) => (
          <option key={rider.id} value={rider.id}>
            {rider.name} · {rider.phone}
          </option>
        ))}
      </select>
      <span
        role="status"
        aria-live="polite"
        className={`min-h-4 text-[11px] tracking-[0.05em] ${
          isError ? "text-flag-red" : "text-muted-foreground"
        }`}
      >
        {message ?? (pending ? "Saving…" : "")}
      </span>
    </div>
  );
}
