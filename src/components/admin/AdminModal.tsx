"use client";

import { useEffect, useId, useState } from "react";
import { X } from "lucide-react";

interface AdminModalProps {
  trigger: React.ReactNode;
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidthClassName?: string;
}

export function AdminModal({
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  children,
  maxWidthClassName = "max-w-lg",
}: AdminModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        aria-haspopup="dialog"
        aria-label={triggerLabel}
      >
        {trigger}
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className={`max-h-[90vh] w-full overflow-y-auto rounded-md border border-border bg-card p-6 shadow-xl ${maxWidthClassName}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id={titleId}
                  className="font-display text-xl uppercase tracking-[0.08em]"
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descriptionId}
                    className="mt-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" strokeWidth={1.7} />
              </button>
            </div>
            <div className="mt-5">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
