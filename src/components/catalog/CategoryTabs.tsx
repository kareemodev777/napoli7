"use client";

import type { Category } from "@/data/types/catalog";

type Filter = "all" | Category["id"];

interface CategoryTabsProps {
  categories: Category[];
  active: Filter;
  onChange: (next: Filter) => void;
}

export function CategoryTabs({
  categories,
  active,
  onChange,
}: CategoryTabsProps) {
  const items: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    ...categories.map((c) => ({ id: c.id as Filter, label: c.label })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Menu categories"
      className="flex flex-wrap gap-px border border-border bg-border"
    >
      {items.map((it) => {
        const isActive = it.id === active;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(it.id)}
            className={
              "min-h-[44px] px-5 font-display text-xs tracking-[0.2em] uppercase " +
              (isActive
                ? "bg-brand text-primary-foreground"
                : "bg-background hover:bg-muted")
            }
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
