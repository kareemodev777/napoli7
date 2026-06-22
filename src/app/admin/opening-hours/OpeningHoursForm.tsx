"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { OrderingDay } from "@/lib/ordering-hours";
import {
  upsertOpeningHours,
  type OpeningHoursFormState,
} from "./actions";

const INITIAL_STATE: OpeningHoursFormState = { ok: false, message: "" };

// Preset notes offered as dropdown suggestions. The field stays free text, so
// any custom note can still be typed in.
const NOTE_PRESETS = [
  "Kitchen closes 30 min early",
  "Last orders 11:30 PM",
  "Holiday hours",
  "Reduced hours",
  "Closed for a private event",
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center justify-center bg-brand px-4 py-3 font-display text-xs tracking-[0.2em] uppercase text-primary-foreground hover:bg-brand-hover disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

function OpeningHoursFormFields({ day }: { day: OrderingDay }) {
  const [state, formAction] = useActionState(upsertOpeningHours, INITIAL_STATE);
  const [isClosed, setIsClosed] = useState(day.isClosed);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="day_of_week" value={day.dayOfWeek} />
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="is_closed"
          checked={isClosed}
          onChange={(event) => setIsClosed(event.target.checked)}
          className="h-4 w-4"
        />
        Closed all day
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="block text-muted-foreground">Opens at</span>
          <input
            type="time"
            name="opens_at"
            defaultValue={day.opensAt ?? ""}
            disabled={isClosed}
            className="w-full border border-border bg-background px-3 py-2.5 disabled:opacity-50"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="block text-muted-foreground">Closes at</span>
          <input
            type="time"
            name="closes_at"
            defaultValue={day.closesAt ?? ""}
            disabled={isClosed}
            className="w-full border border-border bg-background px-3 py-2.5 disabled:opacity-50"
          />
        </label>
      </div>

      <label className="space-y-2 text-sm block">
        <span className="block text-muted-foreground">Note</span>
        <input
          type="text"
          name="note"
          list="opening-hours-note-presets"
          defaultValue={day.note ?? ""}
          placeholder="Choose a preset or type your own"
          className="w-full border border-border bg-background px-3 py-2.5"
        />
        <datalist id="opening-hours-note-presets">
          {NOTE_PRESETS.map((preset) => (
            <option key={preset} value={preset} />
          ))}
        </datalist>
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.message ? (
          <p
            role="status"
            className={
              "text-sm " + (state.ok ? "text-emerald-600" : "text-red-600")
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function OpeningHoursForm({ day }: { day: OrderingDay }) {
  const key = [day.dayOfWeek, day.isClosed, day.opensAt, day.closesAt, day.note]
    .map((value) => value ?? "")
    .join("|");

  return <OpeningHoursFormFields key={key} day={day} />;
}
