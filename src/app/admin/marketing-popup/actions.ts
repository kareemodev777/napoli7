"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  isPopupCtaType,
  normalizePopupDelaySeconds,
} from "@/lib/marketing-popup";
import { MARKETING_POPUP_CACHE_TAG } from "@/lib/marketing-popup.server";

const BUCKET = "catalog-images";
const MAX_MB = 6;
const MAX_BYTES = MAX_MB * 1024 * 1024;

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export interface MarketingPopupActionResult {
  error?: string;
  message?: string;
}

/**
 * Save the storefront marketing popup. A new image can be uploaded (to the public
 * `catalog-images` bucket under `popup/`), or an image path/URL typed directly, or
 * the current one kept. Everything is written to the single `marketing_popup` row.
 */
export async function updateMarketingPopup(
  _prev: MarketingPopupActionResult,
  formData: FormData,
): Promise<MarketingPopupActionResult> {
  await requireAdmin();

  const enabled = formData.get("enabled") === "on";
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const ctaTypeRaw = String(formData.get("cta_type") ?? "none");
  const ctaType = isPopupCtaType(ctaTypeRaw) ? ctaTypeRaw : "none";
  const ctaLabel = String(formData.get("cta_label") ?? "").trim();
  const ctaHref = String(formData.get("cta_href") ?? "").trim();
  const ctaCode = String(formData.get("cta_code") ?? "").trim().toUpperCase();
  const delaySeconds = normalizePopupDelaySeconds(
    Number(formData.get("delay_seconds")),
  );

  // Image: an uploaded file wins; otherwise a directly-typed path/URL; otherwise
  // whatever is already saved.
  let imageUrl = String(formData.get("current_image_url") ?? "").trim();
  const typedUrl = String(formData.get("image_url") ?? "").trim();
  if (typedUrl) imageUrl = typedUrl;

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return { error: "Upload an image file (JPG, PNG, or WebP)." };
    }
    if (file.size > MAX_BYTES) {
      return { error: `Image must be smaller than ${MAX_MB} MB.` };
    }
    const supabase = createServiceRoleClient();
    const path = `popup/popup-${Date.now()}.${extensionFor(file)}`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl: "31536000",
        contentType: file.type || "image/jpeg",
        upsert: true,
      });
    if (uploadError) {
      console.error("[admin/marketing-popup] upload failed", uploadError);
      return { error: "Upload failed. Try again." };
    }
    imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  // Guard against enabling an empty popup that would open to nothing.
  if (enabled && !imageUrl && !title && !body) {
    return {
      error: "Add an image or some text before enabling the popup.",
    };
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("marketing_popup").upsert({
    id: 1,
    enabled,
    image_url: imageUrl,
    title,
    body,
    cta_type: ctaType,
    cta_label: ctaLabel,
    cta_href: ctaHref,
    cta_code: ctaCode,
    delay_seconds: delaySeconds,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[admin/marketing-popup] save failed", error);
    return { error: "Could not save the popup. Try again." };
  }

  // Bust the cached config and re-render every storefront route that mounts it.
  updateTag(MARKETING_POPUP_CACHE_TAG);
  revalidatePath("/admin/marketing-popup");
  revalidatePath("/", "layout");

  return {
    message: enabled
      ? "Popup saved and live on the storefront."
      : "Popup saved (currently disabled).",
  };
}
