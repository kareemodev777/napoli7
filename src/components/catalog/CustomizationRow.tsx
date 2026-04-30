"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatAed } from "./PriceBadge";
import type {
  CustomizationChoice,
  ProductCustomization,
} from "@/data/types/catalog";

interface CustomizationRowProps {
  customization: ProductCustomization;
  value: CustomizationChoice;
  onChange: (next: CustomizationChoice) => void;
}

export function CustomizationRow({
  customization,
  value,
  onChange,
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
          <Choice id={`${baseId}-extra`} value="extra">
            Extra +{formatAed(customization.extraPrice)}
          </Choice>
        ) : null}
        {customization.removable ? (
          <Choice id={`${baseId}-without`} value="without">
            Without
          </Choice>
        ) : null}
      </RadioGroup>
    </div>
  );
}

function Choice({
  id,
  value,
  children,
}: {
  id: string;
  value: CustomizationChoice;
  children: React.ReactNode;
}) {
  return (
    <Label
      htmlFor={id}
      className="inline-flex items-center gap-2 border border-border px-3 py-2 text-xs font-display tracking-[0.1em] uppercase has-[:checked]:bg-brand has-[:checked]:text-primary-foreground has-[:checked]:border-brand cursor-pointer"
    >
      <RadioGroupItem id={id} value={value} className="sr-only" />
      <span>{children}</span>
    </Label>
  );
}
