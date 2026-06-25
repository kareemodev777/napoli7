"use client";

import { useRef, useState, useTransition } from "react";
import {
  updateSiteImage,
  type SiteImageActionResult,
} from "./actions";
import {
  SITE_IMAGE_MAX_MB,
  SITE_IMAGE_MAX_WIDTH,
  type SiteImage,
  type SiteImageKey,
} from "@/lib/site-images";

/**
 * Compress + resize an image in the browser before upload: cap the longest edge
 * at SITE_IMAGE_MAX_WIDTH and re-encode to WebP (~82% quality). This keeps the
 * live site fast and shrinks the payload so it never trips the server-action
 * body limit. Animated GIFs and already-smaller results are passed through
 * untouched so we never make a file bigger or break animation.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, SITE_IMAGE_MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    // If anything goes wrong, fall back to the original file.
    return file;
  }
}

export function SiteImageForm({
  imageKey,
  label,
  description,
  aspect,
  recommended,
  current,
}: {
  imageKey: SiteImageKey;
  label: string;
  description: string;
  aspect: string;
  recommended: string;
  current: SiteImage;
}) {
  const [state, setState] = useState<SiteImageActionResult>({});
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({});
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const file = fileRef.current?.files?.[0];
      if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
          setState({ error: "Upload an image (JPG, PNG, WebP, or GIF)." });
          return;
        }
        // Resize/compress in the browser, then send the smaller file.
        data.set("file", await compressImage(file));
      } else {
        // No new file — don't send an empty one (alt-text-only update).
        data.delete("file");
      }
      const result = await updateSiteImage({}, data);
      setState(result);
      if (result.message) form.reset();
    });
  }

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

      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <input type="hidden" name="key" value={imageKey} />
        <input type="hidden" name="currentUrl" value={current.url} />

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-foreground">Replace image</span>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
          />
          <span className="text-xs text-muted-foreground">
            Recommended {recommended} ({aspect.replace(/\s/g, "")}). JPG, PNG,
            WebP, or GIF, up to {SITE_IMAGE_MAX_MB} MB. We auto-resize and
            compress large images to keep the site fast. Leave empty to only
            update the description.
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
