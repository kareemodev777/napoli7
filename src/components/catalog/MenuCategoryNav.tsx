"use client";

import { useEffect, useState } from "react";
import type { Category } from "@/data/types/catalog";

interface MenuCategoryNavProps {
  categories: Category[];
}

export function MenuCategoryNav({ categories }: MenuCategoryNavProps) {
  const [active, setActive] = useState<string>(categories[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              (b.intersectionRect.height ?? 0) -
              (a.intersectionRect.height ?? 0),
          );
        if (visible[0]?.target.id) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    categories.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [categories]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    setActive(id);
    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
    history.replaceState(null, "", `#${id}`);
  }

  return (
    <nav
      aria-label="Menu sections"
      className="sticky top-[var(--header-h)] z-20 -mx-6 md:-mx-10 mb-8 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border"
    >
      <ul className="flex items-center gap-px overflow-x-auto px-6 md:px-10 no-scrollbar">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <li key={c.id} className="shrink-0">
              <a
                href={`#${c.id}`}
                onClick={(e) => handleClick(e, c.id)}
                aria-current={isActive ? "true" : undefined}
                className={
                  "block min-h-[44px] py-3 px-4 font-display text-[11px] tracking-[0.2em] uppercase border-b-2 transition-colors " +
                  (isActive
                    ? "border-brand text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground")
                }
              >
                {c.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
