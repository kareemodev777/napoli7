import type { ReactNode } from "react";
import { upsertZone } from "./actions";
import type { DeliveryZoneRow } from "./types";

export function money(value: string | number | null) {
  if (value === null) return "0";
  return Number(value).toFixed(2);
}

export function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  hint,
  step,
  min,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
  step?: string;
  min?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="min-h-5 font-display text-xs uppercase tracking-[0.1em] text-foreground">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={step ?? (type === "number" ? "any" : undefined)}
        min={min}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-none border border-border bg-background pl-3 pr-8 text-sm text-foreground focus:border-brand focus:outline-none"
      />
      {hint ? (
        <span className="min-h-8 text-xs leading-4 text-muted-foreground">
          {hint}
        </span>
      ) : (
        <span className="min-h-4" aria-hidden="true" />
      )}
    </label>
  );
}

export function SaveButton({ children = "Save" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover"
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "active" | "hidden";
}) {
  const toneClass =
    tone === "active"
      ? "border-transparent bg-green-100 text-green-800"
      : tone === "hidden"
        ? "border-transparent bg-muted text-muted-foreground"
        : "border-border bg-background text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function ZoneForm({ zone }: { zone?: DeliveryZoneRow }) {
  return (
    <form action={upsertZone} className="grid gap-3">
      <input type="hidden" name="originalArea" value={zone?.area ?? ""} />
      <Field
        label="Area name"
        name="area"
        defaultValue={zone?.area}
        required
        placeholder="Al Jurf 2"
        hint="Shown in the checkout area picker."
      />
      <Field
        label="Delivery fee (AED)"
        name="fee_aed"
        type="number"
        step="0.01"
        min="0"
        defaultValue={zone ? Number(zone.fee_aed) : 0}
        required
      />
      <Field
        label="Display order"
        name="position"
        type="number"
        defaultValue={zone?.position ?? 0}
        hint="Sort order, lower shows first."
      />
      <label className="inline-flex h-11 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm">
        <input
          name="active"
          type="checkbox"
          defaultChecked={zone?.active ?? true}
        />
        Active (visible at checkout)
      </label>
      <SaveButton>{zone ? "Save zone" : "Add zone"}</SaveButton>
    </form>
  );
}
