"use client";

import { Trash2 } from "lucide-react";
import { deletePromo } from "./actions";

export function DeletePromoButton({ code }: { code: string }) {
  return (
    <form action={deletePromo}>
      <input type="hidden" name="code" value={code} />
      <button
        type="submit"
        aria-label={`Delete ${code}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={(event) => {
          if (!window.confirm(`Delete promo code ${code}?`)) {
            event.preventDefault();
          }
        }}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
      </button>
    </form>
  );
}
