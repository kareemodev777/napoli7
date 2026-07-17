"use client";

import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: "sm" | "md" | "lg";
}

export function QuantityStepper({
  value,
  min = 1,
  max = 20,
  onChange,
  size = "md",
}: QuantityStepperProps) {
  const cell =
    size === "lg" ? "h-12 w-12" : size === "sm" ? "h-10 w-10" : "h-11 w-11";
  return (
    <div
      role="group"
      aria-label="Quantity"
      className="inline-flex items-center border border-border"
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={
          cell +
          " inline-flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        }
      >
        <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
      <span
        aria-live="polite"
        className={
          (size === "lg" ? "min-w-12" : size === "sm" ? "min-w-10" : "min-w-11") +
          " text-center font-display tabular-nums px-1"
        }
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={
          cell +
          " inline-flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        }
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      </button>
    </div>
  );
}
