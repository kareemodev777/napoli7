import type { ReactNode } from "react";
import { upsertRider } from "./actions";
import type { RiderRow } from "./types";

function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
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
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground focus:border-brand focus:outline-none"
      />
      {hint ? (
        <span className="text-xs leading-4 text-muted-foreground">{hint}</span>
      ) : null}
    </label>
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

export function RiderForm({ rider }: { rider?: RiderRow }) {
  return (
    <form action={upsertRider} className="grid gap-3">
      <input type="hidden" name="id" value={rider?.id ?? ""} />
      <Field
        label="Rider name"
        name="name"
        defaultValue={rider?.name}
        required
        placeholder="Mohammed Ali"
      />
      <Field
        label="WhatsApp number"
        name="phone"
        type="tel"
        defaultValue={rider?.phone}
        required
        placeholder="0501234567"
        hint="UAE mobile. Order briefs are sent here over WhatsApp on assignment."
      />
      <Field
        label="Vehicle (optional)"
        name="vehicle"
        defaultValue={rider?.vehicle ?? ""}
        placeholder="Motorcycle"
      />
      <label className="inline-flex h-11 w-fit items-center gap-2 rounded-md border border-border px-3 text-sm">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={rider?.is_active ?? true}
        />
        Active (available to assign)
      </label>
      <button
        type="submit"
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover"
      >
        {rider ? "Save rider" : "Add rider"}
      </button>
    </form>
  );
}
