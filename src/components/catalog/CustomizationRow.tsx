"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { formatAed } from "./PriceBadge";
import { MAX_EXTRA_QUANTITY } from "@/lib/checkout-pricing";
import type {
  CustomizationChoice,
  ProductCustomization,
} from "@/data/types/catalog";

interface CustomizationRowProps {
  customization: ProductCustomization;
  value: CustomizationChoice;
  onChange: (next: CustomizationChoice) => void;
  /** Helpings when `value` is "extra". 1 unless the customer stepped it up. */
  helpings: number;
  onHelpingsChange: (next: number) => void;
}

export function CustomizationRow({
  customization,
  value,
  onChange,
  helpings,
  onHelpingsChange,
}: CustomizationRowProps) {
  const baseId = `cust-${customization.position}-${customization.ingredient.replace(/\s+/g, "-")}`;
  const labelId = `${baseId}-label`;
  return (
    <div className="border-t border-border py-5 grid md:grid-cols-[1fr_auto] gap-3 items-start">
      <p
        id={labelId}
        className="font-display text-sm uppercase tracking-[0.1em]"
      >
        {customization.ingredient}
      </p>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as CustomizationChoice)}
        aria-labelledby={labelId}
        className="flex flex-wrap gap-3"
      >
        <Choice id={`${baseId}-default`} value="default">
          Default
        </Choice>
        {customization.extraPrice !== null ? (
          <Choice
            id={`${baseId}-extra`}
            value="extra"
            selected={value === "extra"}
            onClear={() => onChange("default")}
          >
            Extra +{formatAed(customization.extraPrice)}
          </Choice>
        ) : null}
        {customization.removable ? (
          <Choice
            id={`${baseId}-without`}
            value="without"
            selected={value === "without"}
            onClear={() => onChange("default")}
          >
            Without
          </Choice>
        ) : null}
      </RadioGroup>
      {/* Only once "Extra" is chosen, and only where there is a rate to charge.
          Stepping below one puts the ingredient back to Default, so the minus
          key means the same thing at every count. */}
      {value === "extra" && customization.extraPrice !== null ? (
        <div className="md:col-start-2 flex items-center justify-end gap-3">
          <div className="inline-flex items-center border border-border">
            <button
              type="button"
              onClick={() =>
                helpings > 1 ? onHelpingsChange(helpings - 1) : onChange("default")
              }
              aria-label={
                helpings > 1
                  ? `One less ${customization.ingredient}`
                  : `Remove extra ${customization.ingredient}`
              }
              className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted"
            >
              <Minus className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
            <span
              aria-live="polite"
              aria-label={`${helpings} x ${customization.ingredient}`}
              className="min-w-8 text-center font-display text-sm tabular-nums"
            >
              {helpings}
            </span>
            <button
              type="button"
              onClick={() => onHelpingsChange(helpings + 1)}
              disabled={helpings >= MAX_EXTRA_QUANTITY}
              aria-label={`One more ${customization.ingredient}`}
              className="h-9 w-9 inline-flex items-center justify-center hover:bg-muted disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
            </button>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            +{formatAed(customization.extraPrice * helpings)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * One option in the row. "Extra" and "Without" also turn OFF when pressed again,
 * returning the ingredient to Default — a radio group alone cannot be un-picked,
 * so choosing "Without" by mistake used to strand you: the only way back was to
 * find and press "Default", which reads as a third choice rather than as undo.
 * Radix fires no change event when the selected item is pressed, so the clear is
 * hung off the click itself.
 */
function Choice({
  id,
  value,
  selected = false,
  onClear,
  children,
}: {
  id: string;
  value: CustomizationChoice;
  selected?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={id}
      className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-display tracking-[0.1em] uppercase has-[:checked]:bg-brand has-[:checked]:text-primary-foreground has-[:checked]:border-brand cursor-pointer"
    >
      <RadioGroupItem
        id={id}
        value={value}
        className="sr-only"
        onClick={() => {
          if (selected) onClear?.();
        }}
      />
      <span>{children}</span>
    </Label>
  );
}
