import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

function safeSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function revalidateProduct(productId: string, slug?: string) {
  revalidatePath("/admin/catalog");
  revalidatePath(`/admin/catalog/${productId}`);
  revalidatePath("/admin/catalog/[id]", "page");
  revalidatePath("/menu");
  if (slug) revalidatePath(`/menu/${slug}`);
  revalidatePath("/menu/[slug]", "page");
}

function storagePathFromPublicUrl(url: string) {
  try {
    const parsed = new URL(url);
    const marker = "/storage/v1/object/public/catalog-images/";
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  await requireAdmin();

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No image selected." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Upload an image file." },
      { status: 400 },
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Image must be smaller than 5 MB." },
      { status: 400 },
    );
  }

  const rawProductId = String(formData.get("productId") ?? "");
  const productId = isUuid(rawProductId) ? rawProductId : "new";
  const slug = safeSegment(String(formData.get("slug") ?? "item")) || "item";
  const ext = extensionFor(file);
  const path = `products/${productId || "new"}/${slug}-${Date.now()}.${ext}`;

  const supabase = createServiceRoleClient();
  const { error } = await supabase.storage
    .from("catalog-images")
    .upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (error) {
    console.error("[catalog/upload-image] upload failed", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  const { data } = supabase.storage.from("catalog-images").getPublicUrl(path);
  if (isUuid(rawProductId)) {
    const { error: updateError } = await supabase
      .from("products")
      .update({ image_url: data.publicUrl })
      .eq("id", rawProductId);

    if (updateError) {
      console.error("[catalog/upload-image] product update failed", updateError);
      return NextResponse.json(
        { error: "Image uploaded, but product update failed." },
        { status: 500 },
      );
    }

    revalidateProduct(rawProductId, slug);
  }

  return NextResponse.json({ url: data.publicUrl, saved: isUuid(rawProductId) });
}

export async function PATCH(request: Request) {
  await requireAdmin();

  const body = (await request.json()) as {
    productId?: string;
    slug?: string;
    url?: string;
  };

  if (!body.productId || !isUuid(body.productId) || !body.url) {
    return NextResponse.json({ error: "Invalid image update." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("products")
    .update({ image_url: body.url })
    .eq("id", body.productId);

  if (error) {
    console.error("[catalog/upload-image] image selection failed", error);
    return NextResponse.json({ error: "Image update failed." }, { status: 500 });
  }

  revalidateProduct(body.productId, body.slug);
  return NextResponse.json({ url: body.url, saved: true });
}

export async function DELETE(request: Request) {
  await requireAdmin();

  const body = (await request.json()) as {
    productId?: string;
    slug?: string;
    url?: string;
  };

  if (!body.productId || !isUuid(body.productId) || !body.url) {
    return NextResponse.json({ error: "Invalid image delete." }, { status: 400 });
  }

  const path = storagePathFromPublicUrl(body.url);
  if (!path || !path.startsWith(`products/${body.productId}/`)) {
    return NextResponse.json({ error: "Invalid gallery image." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("image_url")
    .eq("id", body.productId)
    .maybeSingle();

  if (productError) {
    console.error("[catalog/upload-image] product lookup failed", productError);
    return NextResponse.json({ error: "Image delete failed." }, { status: 500 });
  }

  if (product?.image_url === body.url) {
    return NextResponse.json(
      { error: "Choose another image before deleting the current one." },
      { status: 409 },
    );
  }

  const { error } = await supabase.storage.from("catalog-images").remove([path]);
  if (error) {
    console.error("[catalog/upload-image] delete failed", error);
    return NextResponse.json({ error: "Image delete failed." }, { status: 500 });
  }

  revalidateProduct(body.productId, body.slug);
  return NextResponse.json({ deleted: true });
}
