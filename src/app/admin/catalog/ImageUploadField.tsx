"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ImageUploadFieldProps = {
  defaultValue: string;
  productId?: string;
  slug?: string;
};

export function ImageUploadField({
  defaultValue,
  productId,
  slug,
}: ImageUploadFieldProps) {
  const [imageUrl, setImageUrl] = useState(defaultValue);
  const [status, setStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(file: File | undefined) {
    if (!file) return;
    setStatus("Uploading image...");

    const formData = new FormData();
    formData.set("file", file);
    if (productId) formData.set("productId", productId);
    if (slug) formData.set("slug", slug);

    const response = await fetch("/api/admin/catalog/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setStatus("Upload failed. Try a smaller JPG, PNG, WebP, or GIF.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    const data = (await response.json()) as { saved?: boolean; url?: string };
    if (!data.url) {
      setStatus("Upload failed. Try again.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setImageUrl(data.url);
    if (data.saved) {
      setStatus("Image uploaded and saved.");
      router.refresh();
    } else {
      setStatus("Image uploaded. Save the item to keep it.");
    }
  }

  return (
    <div className="grid min-w-0 gap-2 text-sm">
      {imageUrl ? (
        <div className="overflow-hidden rounded-md border border-border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      ) : null}
      <label className="grid min-w-0 gap-1">
        <span className="font-medium text-foreground">Image URL</span>
        <input
          name="image_url"
          required
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
        />
      </label>
      <label className="grid min-w-0 gap-1">
        <span className="font-medium text-foreground">Upload image</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
        />
      </label>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {status || "Upload JPG, PNG, WebP, or GIF. Max 5 MB."}
      </p>
    </div>
  );
}
