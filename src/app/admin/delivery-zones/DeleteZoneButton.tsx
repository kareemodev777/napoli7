"use client";

import { Trash2 } from "lucide-react";
import { deleteZone } from "./actions";

export function DeleteZoneButton({ area }: { area: string }) {
  return (
    <form
      action={deleteZone}
      onSubmit={(event) => {
        if (!confirm(`Delete the "${area}" delivery zone?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="area" value={area} />
      <button
        type="submit"
        aria-label={`Delete ${area}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground"
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </form>
  );
}
