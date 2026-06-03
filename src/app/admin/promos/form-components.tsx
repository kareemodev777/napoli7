import type { ReactNode } from "react";
import { upsertPromo } from "./actions";
import type { PromoCodeRow } from "./types";

export function money(value: string | number | null) {
  if (value === null) return "—";
  return Number(value).toFixed(2);
}

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
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
  max,
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
  max?: string;
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
        max={max}
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
  tone?: "default" | "active" | "hidden" | "warning";
}) {
  const toneClass =
    tone === "active"
      ? "border-transparent bg-green-100 text-green-800"
      : tone === "hidden"
        ? "border-transparent bg-muted text-muted-foreground"
        : tone === "warning"
          ? "border-transparent bg-amber-100 text-amber-900"
          : "border-border bg-background text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function PromoForm({ promo }: { promo?: PromoCodeRow }) {
  const isPct = promo?.discount_pct != null || !promo;
  const discountValue = isPct ? promo?.discount_pct : promo?.discount_aed;

  return (
    <form action={upsertPromo} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="originalCode" value={promo?.code ?? ""} />
      <Field
        label="Promo code"
        name="code"
        defaultValue={promo?.code}
        required
        placeholder="WELCOME10"
        hint="Codes are saved uppercase."
      />
      <label className="grid min-w-0 gap-1 text-sm">
        <span className="min-h-5 font-display text-xs uppercase tracking-[0.1em] text-foreground">
          Discount type
        </span>
        <select
          name="discount_type"
          defaultValue={isPct ? "pct" : "aed"}
          className="h-11 w-full rounded-none border border-border bg-background px-3 text-sm text-foreground focus:border-brand focus:outline-none"
        >
          <option value="pct">Percentage (%)</option>
          <option value="aed">Flat AED</option>
        </select>
        <span className="min-h-4" aria-hidden="true" />
      </label>
      <Field
        label="Discount value"
        name="discount_value"
        type="number"
        step="0.01"
        min="0.01"
        max={isPct ? "100" : undefined}
        defaultValue={discountValue == null ? "" : Number(discountValue)}
        required
      />
      <Field
        label="Minimum subtotal"
        name="min_subtotal_aed"
        type="number"
        step="0.01"
        min="0"
        defaultValue={promo ? Number(promo.min_subtotal_aed) : 0}
      />
      <Field
        label="Valid from"
        name="valid_from"
        type="datetime-local"
        defaultValue={dateTimeInput(promo?.valid_from ?? null)}
        hint="Leave blank to start immediately."
      />
      <Field
        label="Valid until"
        name="valid_until"
        type="datetime-local"
        defaultValue={dateTimeInput(promo?.valid_until ?? null)}
        hint="Leave blank for no expiry."
      />
      <Field
        label="Maximum uses"
        name="max_uses"
        type="number"
        min="0"
        step="1"
        defaultValue={promo?.max_uses ?? ""}
        hint="Blank means unlimited."
      />
      <div className="flex flex-wrap items-end gap-3 sm:col-span-2">
        <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={promo?.active ?? true}
          />
          Active at checkout
        </label>
        <SaveButton>{promo ? "Save promo" : "Add promo"}</SaveButton>
      </div>
    </form>
  );
}
