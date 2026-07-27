"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  updateMarketingPopup,
  type MarketingPopupActionResult,
} from "./actions";
import {
  POPUP_CTA_TYPES,
  type MarketingPopup,
  type PopupCtaType,
} from "@/lib/marketing-popup";

const CTA_LABELS: Record<PopupCtaType, string> = {
  none: "No button (image / text only)",
  link: "Link — a button that opens a page",
  copy: "Copy — copies a promo code",
  redeem: "Redeem — applies a code, then checkout",
};

const MAX_WIDTH = 1200;

/**
 * Resize + re-encode the chosen image to WebP in the browser before upload, so a
 * heavy flyer becomes a lean asset and never trips the server-action body limit.
 * Mirrors the site-images uploader. Falls back to the original on any failure.
 */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
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
    return file;
  }
}

const card = "rounded-lg border border-border bg-card p-6";
const heading = "font-display text-sm uppercase tracking-[0.18em] text-foreground";
const fieldLabel =
  "font-display text-xs uppercase tracking-[0.16em] text-muted-foreground";
const field =
  "h-11 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-brand";

export function MarketingPopupForm({ config }: { config: MarketingPopup }) {
  const [state, setState] = useState<MarketingPopupActionResult>({});
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  // Controlled so the live preview stays in lockstep with the fields.
  const [enabled, setEnabled] = useState(config.enabled);
  const [delaySeconds, setDelaySeconds] = useState(String(config.delaySeconds));
  const [title, setTitle] = useState(config.title);
  const [body, setBody] = useState(config.body);
  const [ctaType, setCtaType] = useState<PopupCtaType>(config.ctaType);
  const [ctaLabel, setCtaLabel] = useState(config.ctaLabel);
  const [ctaHref, setCtaHref] = useState(config.ctaHref);
  const [ctaCode, setCtaCode] = useState(config.ctaCode);
  const [pathUrl, setPathUrl] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);

  // Revoke the object URL for a previewed upload when it changes / unmounts.
  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const previewImage = filePreview ?? (pathUrl.trim() || config.imageUrl);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setFilePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file && file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({});
    startTransition(async () => {
      const data = new FormData();
      if (enabled) data.set("enabled", "on");
      data.set("delay_seconds", delaySeconds);
      data.set("title", title);
      data.set("body", body);
      data.set("cta_type", ctaType);
      data.set("cta_label", ctaLabel);
      data.set("cta_href", ctaHref);
      data.set("cta_code", ctaCode);
      data.set("current_image_url", config.imageUrl);
      if (pathUrl.trim()) data.set("image_url", pathUrl.trim());

      const file = fileRef.current?.files?.[0];
      if (file && file.size > 0) {
        if (!file.type.startsWith("image/")) {
          setState({ error: "Upload an image (JPG, PNG, or WebP)." });
          return;
        }
        data.set("file", await compressImage(file));
      }
      setState(await updateMarketingPopup({}, data));
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_30rem]"
    >
      <div className="grid gap-6">
        <section className={card}>
          <h2 className={heading}>Visibility &amp; timing</h2>
          <label className="mt-5 flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            <span>Show this popup on the storefront</span>
          </label>
          <label className="mt-5 grid gap-1.5 text-sm sm:max-w-xs">
            <span className={fieldLabel}>Open delay (seconds)</span>
            <input
              type="number"
              min="0"
              max="60"
              step="1"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              className={field}
            />
            <span className="text-xs text-muted-foreground">
              Time after the page loads before it opens. 0 opens it immediately.
            </span>
          </label>
        </section>

        <section className={card}>
          <h2 className={heading}>Image</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            The image carries the message. Upload one, or point to an existing
            path.
          </p>
          <label className="mt-5 grid gap-1.5 text-sm">
            <span className={fieldLabel}>Upload</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onPickFile}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
            />
            <span className="text-xs text-muted-foreground">
              JPG, PNG, or WebP. Large images are resized and compressed
              automatically.
            </span>
          </label>
          <label className="mt-4 grid gap-1.5 text-sm">
            <span className={fieldLabel}>…or image path</span>
            <input
              type="text"
              value={pathUrl}
              onChange={(e) => setPathUrl(e.target.value)}
              placeholder="/images/grand-opening.webp"
              className={field}
            />
          </label>
        </section>

        <section className={card}>
          <h2 className={heading}>Message</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Shown beside the image (or on its own for a text-only popup).
          </p>
          <label className="mt-5 grid gap-1.5 text-sm">
            <span className={fieldLabel}>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={field}
            />
          </label>
          <label className="mt-4 grid gap-1.5 text-sm">
            <span className={fieldLabel}>Body</span>
            <textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand"
            />
          </label>
        </section>

        <section className={card}>
          <h2 className={heading}>Button</h2>
          <label className="mt-5 grid gap-1.5 text-sm sm:max-w-md">
            <span className={fieldLabel}>What it does</span>
            <select
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value as PopupCtaType)}
              className={field}
            >
              {POPUP_CTA_TYPES.map((type) => (
                <option key={type} value={type}>
                  {CTA_LABELS[type]}
                </option>
              ))}
            </select>
          </label>

          {ctaType !== "none" ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className={fieldLabel}>Label</span>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder={ctaType === "link" ? "Order now" : "Redeem"}
                  className={field}
                />
              </label>
              {ctaType === "link" ? (
                <label className="grid gap-1.5 text-sm">
                  <span className={fieldLabel}>Goes to</span>
                  <input
                    type="text"
                    value={ctaHref}
                    onChange={(e) => setCtaHref(e.target.value)}
                    placeholder="/menu"
                    className={field}
                  />
                </label>
              ) : (
                <label className="grid gap-1.5 text-sm">
                  <span className={fieldLabel}>Promo code</span>
                  <input
                    type="text"
                    value={ctaCode}
                    onChange={(e) => setCtaCode(e.target.value.toUpperCase())}
                    placeholder="GRANDOPENING"
                    className={`${field} uppercase`}
                  />
                </label>
              )}
            </div>
          ) : null}
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-6 font-display text-xs uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-brand-hover disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save popup"}
          </button>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : state.message ? (
            <p className="text-sm text-green-700">{state.message}</p>
          ) : null}
        </div>
      </div>

      <PopupPreview
        enabled={enabled}
        image={previewImage}
        title={title}
        body={body}
        ctaType={ctaType}
        ctaLabel={ctaLabel}
        ctaCode={ctaCode}
      />
    </form>
  );
}

/** A faithful, non-interactive mock of the storefront popup, so the operator
 *  sees exactly what a customer will. */
function PopupPreview({
  enabled,
  image,
  title,
  body,
  ctaType,
  ctaLabel,
  ctaCode,
}: {
  enabled: boolean;
  image: string;
  title: string;
  body: string;
  ctaType: PopupCtaType;
  ctaLabel: string;
  ctaCode: string;
}) {
  const hasText = Boolean(title || body);
  const hasCta = ctaType !== "none";
  const sideBySide = Boolean(image) && (hasText || hasCta);
  const label =
    ctaType === "copy"
      ? ctaLabel || `Copy ${ctaCode || "code"}`
      : ctaType === "redeem"
        ? ctaLabel || "Redeem now"
        : ctaLabel || "Order now";

  const content =
    hasText || hasCta ? (
      <div className="flex min-h-0 flex-col gap-5 p-5">
        {hasText ? (
          <div className="flex flex-col gap-2.5">
            {title ? (
              <p className="font-display text-xl uppercase tracking-[0.05em] leading-[1.1]">
                {title}
              </p>
            ) : null}
            {body ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            ) : null}
          </div>
        ) : null}
        {hasCta ? (
          <div className="mt-auto flex flex-col gap-2.5 pt-2">
            <span className="w-full rounded-lg bg-brand py-3 text-center font-display text-sm uppercase tracking-[0.2em] text-primary-foreground">
              {label}
            </span>
            <span className="self-center font-display text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Maybe later
            </span>
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="xl:sticky xl:top-6">
      <div className="mb-3 flex items-center justify-between">
        <span className={fieldLabel}>Live preview</span>
        <span
          className={
            "rounded-full px-2.5 py-1 font-display text-[0.625rem] uppercase tracking-[0.16em] " +
            (enabled
              ? "bg-brand-soft text-brand-deep"
              : "bg-muted text-muted-foreground")
          }
        >
          {enabled ? "Live" : "Hidden"}
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-popover shadow-lg ring-1 ring-foreground/10">
        <div className={sideBySide ? "grid grid-cols-2" : ""}>
          {image ? (
            <div className="bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element -- local/admin preview */}
              <img
                src={image}
                alt="Popup preview"
                className="mx-auto block max-h-96 w-full object-contain"
              />
            </div>
          ) : hasText || hasCta ? null : (
            <div className="grid aspect-video place-items-center bg-muted text-xs text-muted-foreground">
              No image
            </div>
          )}
          {content}
        </div>
      </div>
    </div>
  );
}
