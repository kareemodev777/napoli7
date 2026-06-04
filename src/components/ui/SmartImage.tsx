"use client";

import { useCallback, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SmartImageProps = ImageProps & {
  /** Extra classes for the skeleton + error overlay layer (e.g. rounding). */
  overlayClassName?: string;
};

/**
 * next/image wrapper that layers a loading skeleton and a graceful error
 * fallback on top of the real responsive image.
 *
 * It is built for this project's `fill` pattern: place it inside a positioned
 * box (`relative`) that defines the aspect ratio — exactly the wrappers the
 * product cards, hero, cart rows, and editorial grid already provide. The
 * underlying <img> keeps doing the responsive work (`sizes`, srcset,
 * object-fit/position via `className`); this component only adds UI state so a
 * slow image never flashes empty and a missing/broken one never shows the
 * browser's broken-image glyph.
 */
export function SmartImage({
  className,
  overlayClassName,
  onLoad,
  onError,
  alt,
  ...props
}: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  // Cached images can finish loading before React attaches onLoad, which would
  // otherwise leave the skeleton stuck. Resolve the state from the element's
  // own completion status the moment the ref is set.
  const setRef = useCallback((node: HTMLImageElement | null) => {
    if (!node || !node.complete) return;
    setStatus(node.naturalWidth > 0 ? "loaded" : "error");
  }, []);

  return (
    <>
      {status !== "error" ? (
        <Image
          {...props}
          ref={setRef}
          alt={alt}
          className={cn(
            "transition-opacity duration-500 motion-reduce:transition-none",
            status === "loaded" ? "opacity-100" : "opacity-0",
            className,
          )}
          onLoad={(event) => {
            setStatus("loaded");
            onLoad?.(event);
          }}
          onError={(event) => {
            setStatus("error");
            onError?.(event);
          }}
        />
      ) : null}

      {status === "loading" ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-pulse bg-muted",
            overlayClassName,
          )}
        />
      ) : null}

      {status === "error" ? (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 grid place-items-center bg-muted text-muted-foreground",
            overlayClassName,
          )}
        >
          <ImageOff className="h-6 w-6" strokeWidth={1.5} />
        </span>
      ) : null}
    </>
  );
}
