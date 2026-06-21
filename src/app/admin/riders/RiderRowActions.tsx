"use client";

import { Trash2 } from "lucide-react";
import { deleteRider, setRiderActive } from "./actions";

export function RiderActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return (
    <form action={setRiderActive}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="is_active" value={(!isActive).toString()} />
      <button
        type="submit"
        className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 font-display text-[10px] uppercase tracking-[0.14em] text-foreground hover:bg-muted"
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}

export function DeleteRiderButton({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteRider}
      onSubmit={(event) => {
        if (!confirm(`Remove rider "${name}"? They will be unassigned from any orders.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Delete ${name}`}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-destructive/40 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </form>
  );
}
