"use client";

import { useActionState } from "react";
import { updateSiteImage, type SiteImageActionResult } from "./actions";
import type { SiteImage, SiteImageKey } from "@/lib/site-images";

const initial: SiteImageActionResult = {};

export function SiteImageForm({
  imageKey,
  label,
  description,
  aspect,
  current,
}: {
  imageKey: SiteImageKey;
  label: string;
  description: string;
  aspect: string;
  current: SiteImage;
}) {
  const [state, action, pending] = useActionState(updateSiteImage, initial);

  return (
    <article className="rounded-md border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg uppercase tracking-[0.08em]">
            {label}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.alt}
          className="mx-auto w-full max-w-md object-contain"
          style={{ aspectRatio: aspect }}
        />
      </div>

      <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="key" value={imageKey} />
        <input type="hidden" name="currentUrl" value={current.url} />

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Replace image</span>
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
          />
          <span className="text-xs text-muted-foreground">
            JPG, PNG, WebP, or GIF. Max 5 MB. Leave empty to only update the
            description.
          </span>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">
            Description (alt text)
          </span>
          <input
            type="text"
            name="alt"
            defaultValue={current.alt}
            maxLength={200}
            className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </label>

        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm text-green-700">{state.message}</p>
        ) : null}

        <div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save image"}
          </button>
        </div>
      </form>
    </article>
  );
}
