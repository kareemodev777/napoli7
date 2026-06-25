"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App toaster. The storefront ships light-only (see DESIGN.md), so the theme is
 * fixed rather than wired through next-themes. Surfaces are mapped to our
 * tokens so toasts read as part of the Napoli 7 system.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group !rounded-none border border-border bg-card text-card-foreground shadow-md gap-3",
          icon: "text-brand",
          title: "font-display text-sm uppercase tracking-[0.08em]",
          description: "text-muted-foreground text-xs leading-snug",
          actionButton:
            "!rounded-none bg-brand px-2.5 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover",
          cancelButton:
            "!rounded-none bg-muted px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground",
        },
      }}
      style={
        {
          "--border-radius": "0px",
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
