"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { OrderingDay } from "@/lib/ordering-hours";
import {
  defaultTimeSelection,
  TIME_HOUR_OPTIONS,
  TIME_MERIDIEM_OPTIONS,
  TIME_MINUTE_OPTIONS,
} from "./time-input";
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

const TIME_SELECT_CLASS =
  "w-full border border-border bg-background px-3 py-2.5 text-sm font-display tracking-[0.08em] uppercase focus:outline-none focus:border-brand disabled:opacity-50";

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

function TimePickerField({
  label,
  name,
  defaultValue,
  disabled,
}: {
  label: string;
  name: string;
  defaultValue: string | null | undefined;
  disabled: boolean;
}) {
  const selection = defaultTimeSelection(defaultValue);

  return (
    <fieldset className="space-y-2 text-sm">
      <legend className="block text-muted-foreground">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        <label className="sr-only" htmlFor={`${name}_hour`}>
          {label} hour
        </label>
        <select
          id={`${name}_hour`}
          name={`${name}_hour`}
          defaultValue={selection.hour}
          disabled={disabled}
          aria-label={`${label} hour`}
          className={TIME_SELECT_CLASS}
        >
          {TIME_HOUR_OPTIONS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${name}_minute`}>
          {label} minute
        </label>
        <select
          id={`${name}_minute`}
          name={`${name}_minute`}
          defaultValue={selection.minute}
          disabled={disabled}
          aria-label={`${label} minute`}
          className={TIME_SELECT_CLASS}
        >
          {TIME_MINUTE_OPTIONS.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`${name}_meridiem`}>
          {label} AM/PM
        </label>
        <select
          id={`${name}_meridiem`}
          name={`${name}_meridiem`}
          defaultValue={selection.meridiem}
          disabled={disabled}
          aria-label={`${label} AM/PM`}
          className={TIME_SELECT_CLASS}
        >
          {TIME_MERIDIEM_OPTIONS.map((meridiem) => (
            <option key={meridiem} value={meridiem}>
              {meridiem}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
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
        <TimePickerField
          label="Opens at"
          name="opens_at"
          defaultValue={day.opensAt}
          disabled={isClosed}
        />
        <TimePickerField
          label="Closes at"
          name="closes_at"
          defaultValue={day.closesAt}
          disabled={isClosed}
        />
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
