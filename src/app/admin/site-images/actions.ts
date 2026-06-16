"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { SITE_IMAGE_KEYS, type SiteImageKey } from "@/lib/site-images";

export interface SiteImageActionResult {
  error?: string;
  message?: string;
}

const BUCKET = "catalog-images";
const MAX_BYTES = 5 * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function isSiteImageKey(value: string): value is SiteImageKey {
  return (SITE_IMAGE_KEYS as readonly string[]).includes(value);
}

/**
 * Replace a marketing image (or just its alt text). A new file is uploaded to
 * the public `catalog-images` bucket under `site/`; if no file is provided the
 * existing URL is kept and only the alt text / row is updated.
 */
export async function updateSiteImage(
  _prev: SiteImageActionResult,
  formData: FormData,
): Promise<SiteImageActionResult> {
  await requireAdmin();

  const key = String(formData.get("key") ?? "");
  if (!isSiteImageKey(key)) {
    return { error: "Unknown image." };
  }

  const alt = String(formData.get("alt") ?? "").trim();
  const currentUrl = String(formData.get("currentUrl") ?? "").trim();
  const file = formData.get("file");

  let url = currentUrl;

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "Upload an image file (JPG, PNG, WebP, or GIF)." };
    }
    if (file.size > MAX_BYTES) {
      return { error: "Image must be smaller than 5 MB." };
    }

    const supabase = createServiceRoleClient();
    const path = `site/${key}-${Date.now()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (uploadError) {
      console.error("[admin/site-images] upload failed", uploadError);
      return { error: "Upload failed. Try again." };
    }
    url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  if (!url) {
    return { error: "Choose an image to upload." };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("site_images")
    .upsert({ key, url, alt, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[admin/site-images] save failed", error);
    return { error: "Could not save the image. Try again." };
  }

  // Bust the public pages that render these images, plus this admin page.
  revalidatePath("/");
  revalidatePath("/about");
  revalidatePath("/admin/site-images");

  return { message: "Image updated. It is now live on the website." };
}
