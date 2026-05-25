"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductImageManagerProps = {
  currentUrl: string;
  gallery: string[];
  productId: string;
  slug: string;
};

export function ProductImageManager({
  currentUrl,
  gallery,
  productId,
  slug,
}: ProductImageManagerProps) {
  const [imageUrl, setImageUrl] = useState(currentUrl);
  const [galleryUrls, setGalleryUrls] = useState(gallery);
  const [status, setStatus] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [deleteUrl, setDeleteUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function upload(file: File | undefined) {
    if (!file) return;
    setIsBusy(true);
    setStatus("Uploading image...");

    const formData = new FormData();
    formData.set("file", file);
    formData.set("productId", productId);
    formData.set("slug", slug);

    const response = await fetch("/api/admin/catalog/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setStatus("Upload failed. Try a smaller JPG, PNG, WebP, or GIF.");
      setIsBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (data.url) {
      setImageUrl(data.url);
      setGalleryUrls((urls) => Array.from(new Set([data.url!, ...urls])));
      setStatus("Image uploaded and saved.");
      router.refresh();
    } else {
      setStatus("Upload failed. Try again.");
    }
    setIsBusy(false);
  }

  async function selectImage(url: string) {
    if (url === imageUrl) return;
    setIsBusy(true);
    setStatus("Saving selected image...");

    const response = await fetch("/api/admin/catalog/upload-image", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, slug, url }),
    });

    if (!response.ok) {
      setStatus("Could not save selected image. Try again.");
      setIsBusy(false);
      return;
    }

    setImageUrl(url);
    setStatus("Selected image saved.");
    setIsBusy(false);
    router.refresh();
  }

  async function deleteImage() {
    if (!deleteUrl) return;
    if (deleteUrl === imageUrl) {
      setStatus("Choose another image before deleting the current one.");
      setDeleteUrl(null);
      return;
    }

    setIsBusy(true);
    setStatus("Removing image...");

    const response = await fetch("/api/admin/catalog/upload-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, slug, url: deleteUrl }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setStatus(data?.error ?? "Could not remove image. Try again.");
      setIsBusy(false);
      return;
    }

    setGalleryUrls((urls) => urls.filter((item) => item !== deleteUrl));
    setStatus("Image removed from gallery.");
    setDeleteUrl(null);
    setIsBusy(false);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-md border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="aspect-[4/3] w-full object-cover"
        />
      </div>

      <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover">
        <ImagePlus className="h-4 w-4" strokeWidth={1.7} />
        Upload image
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          disabled={isBusy}
          onChange={(event) => upload(event.target.files?.[0])}
          className="sr-only"
        />
      </label>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {status || "Upload JPG, PNG, WebP, or GIF. Max 5 MB."}
      </p>

      {galleryUrls.length > 0 ? (
        <div>
          <h3 className="font-display text-sm uppercase tracking-[0.16em]">
            Gallery
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {galleryUrls.map((url) => {
              const isSelected = url === imageUrl;
              return (
                <div key={url} className="relative">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => selectImage(url)}
                    className={`block w-full overflow-hidden rounded-md border bg-muted ${
                      isSelected
                        ? "border-brand ring-2 ring-brand/30"
                        : "border-border"
                    }`}
                    aria-label={isSelected ? "Current image" : "Use this image"}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                    />
                  </button>
                  {isSelected ? (
                    <span className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-primary-foreground">
                      <Check className="h-3.5 w-3.5" strokeWidth={2} />
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => setDeleteUrl(url)}
                      aria-label="Remove image from gallery"
                      className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-destructive shadow-sm ring-1 ring-border hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <Dialog
        open={deleteUrl !== null}
        onOpenChange={(open) => {
          if (!open && !isBusy) setDeleteUrl(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl uppercase tracking-[0.08em]">
              Remove image
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the image from the gallery.
            </DialogDescription>
          </DialogHeader>

          {deleteUrl ? (
            <div className="overflow-hidden rounded-md border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={deleteUrl}
                alt=""
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <button
                type="button"
                disabled={isBusy}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border px-4 text-sm hover:bg-muted disabled:opacity-60"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={deleteImage}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.8} />
              {isBusy ? "Removing..." : "Remove image"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
