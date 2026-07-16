import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { ProductImageManager } from "../ProductImageManager";
import {
  deleteCustomization,
  deleteSize,
  upsertCustomization,
  upsertSize,
} from "../actions";
import {
  Badge,
  Field,
  ProductForm,
  SaveButton,
  SizeSelect,
} from "../form-components";
import { money } from "../format";
import type { CategoryRow, ProductRow } from "../types";
import { AdminModal } from "@/components/admin/AdminModal";
import { compareSizes, SIZE_OPTIONS, type SizeId } from "@/data/types/catalog";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Edit item · Admin",
    alternates: { canonical: `/admin/catalog/${id}` },
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

type Params = {
  id: string;
};

function AddPriceModal({
  productId,
  defaultPrice,
}: {
  productId: string;
  defaultPrice: number;
}) {
  return (
    <AdminModal
      title="Add price"
      description="Add a small, regular, large, or family price option for this item."
      triggerLabel="Add price"
      triggerClassName="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
      maxWidthClassName="max-w-xl"
      trigger={
        <>
          <Plus className="h-4 w-4" strokeWidth={1.7} />
          Price
        </>
      }
    >
      <form action={upsertSize} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="product_id" value={productId} />
        <SizeSelect defaultValue="regular" />
        <Field label="Label" name="label" defaultValue="Regular" />
        <Field
          label="Detail"
          name="detail"
          hint={'Shown to customers, e.g. "30 cm" (medium) or "24 cm" (small).'}
        />
        <Field
          label="Price"
          name="price_aed"
          type="number"
          defaultValue={defaultPrice}
        />
        <div className="sm:col-span-2">
          <SaveButton>Add price</SaveButton>
        </div>
      </form>
    </AdminModal>
  );
}

function CompactSizeSelect({ defaultValue }: { defaultValue: SizeId }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground lg:sr-only">
        Size
      </span>
      <select
        name="size_id"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-border bg-background pl-3 pr-8 text-sm text-foreground"
      >
        {SIZE_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompactField({
  label,
  name,
  defaultValue = "",
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground lg:sr-only">
        {label}
      </span>
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
      />
    </label>
  );
}

async function loadProduct(id: string) {
  if (!HAS_SUPABASE_SERVICE) return null;

  const supabase = createServiceRoleClient();
  const [
    { data: categories },
    { data: product },
    { data: imageObjects },
  ] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase
      .from("products")
      .select("*, product_sizes(*), product_customizations(*)")
      .eq("id", id)
      .maybeSingle(),
    supabase.storage.from("catalog-images").list(`products/${id}`, {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    }),
  ]);

  if (!product) return null;

  const gallery = (imageObjects ?? [])
    .filter((object) => object.name && !object.name.endsWith("/"))
    .map((object) => {
      const { data } = supabase.storage
        .from("catalog-images")
        .getPublicUrl(`products/${id}/${object.name}`);
      return data.publicUrl;
    });

  return {
    categories: (categories ?? []) as CategoryRow[],
    product: product as ProductRow,
    gallery,
  };
}

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const data = await loadProduct(id);
  if (!data) notFound();

  const { categories, product, gallery } = data;
  const sizes = product.product_sizes
    .slice()
    .sort((a, b) => compareSizes(a.size_id, b.size_id));
  const ingredients = product.product_customizations
    .slice()
    .sort((a, b) => a.position - b.position);

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1100px]">
        <Link
          href="/admin/catalog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.7} />
          Back to catalog
        </Link>

        <div className="mt-6 overflow-hidden rounded-md border border-border bg-card">
          <div className="grid md:grid-cols-[280px_1fr]">
            <div className="aspect-[4/3] bg-muted md:aspect-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-3xl uppercase tracking-[1.2px]">
                    {product.name}
                  </h1>
                  {product.name_it ? (
                    <p className="mt-1 text-sm italic text-muted-foreground">
                      {product.name_it}
                    </p>
                  ) : null}
                </div>
                <Badge>{product.is_active ? "Visible" : "Hidden"}</Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {product.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge>Main {money(product.price_aed)} AED</Badge>
                <Badge>{sizes.length} prices</Badge>
                <Badge>{ingredients.length} ingredients</Badge>
                {product.is_veg ? <Badge>Vegetarian</Badge> : null}
                {product.is_spicy ? <Badge>Spicy</Badge> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8">
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Images
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload a new image or choose one from this item&apos;s gallery.
              </p>
              <div className="mt-5">
                <ProductImageManager
                  currentUrl={product.image_url}
                  gallery={Array.from(new Set([product.image_url, ...gallery]))}
                  productId={product.id}
                  slug={product.slug}
                />
              </div>
            </section>

            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Item details
              </h2>
              <div className="mt-5">
                <ProductForm
                  product={product}
                  categories={categories}
                  showImageUpload={false}
                />
              </div>
            </section>
          </div>

          <section className="rounded-md border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Prices and sizes
              </h2>
              <div className="flex items-center gap-2">
                <Badge>{sizes.length} prices</Badge>
                <AddPriceModal
                  productId={product.id}
                  defaultPrice={Number(product.price_aed)}
                />
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-md border border-border">
              <div className="hidden bg-muted/40 px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground lg:grid lg:grid-cols-[170px_minmax(160px,1fr)_minmax(180px,1fr)_120px_90px_48px] lg:gap-3">
                <span>Size</span>
                <span>Label</span>
                <span>Detail</span>
                <span>Price</span>
                <span className="sr-only">Save</span>
                <span className="sr-only">Delete</span>
              </div>
              {sizes.map((size) => (
                <div
                  key={size.id}
                  className="border-t border-border first:border-t-0 bg-background p-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[170px_minmax(160px,1fr)_minmax(180px,1fr)_120px_90px_48px] lg:items-center">
                    <form action={upsertSize} className="contents">
                      <input type="hidden" name="id" value={size.id} />
                      <input type="hidden" name="product_id" value={product.id} />
                      <CompactSizeSelect defaultValue={size.size_id} />
                      <CompactField
                        label="Label"
                        name="label"
                        defaultValue={size.label}
                      />
                      <CompactField
                        label="Detail"
                        name="detail"
                        defaultValue={size.detail}
                      />
                      <CompactField
                        label="Price"
                        name="price_aed"
                        type="number"
                        defaultValue={Number(size.price_aed)}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
                      >
                        Save
                      </button>
                    </form>
                    <form action={deleteSize} className="contents">
                      <input type="hidden" name="id" value={size.id} />
                      <button
                        type="submit"
                        aria-label={`Delete ${size.label} price`}
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground lg:w-11"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                        <span className="lg:sr-only">Delete</span>
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Ingredients
              </h2>
              <Badge>{ingredients.length} ingredients</Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Tick <strong>Base ingredient</strong> for what the pizza comes with
              — these are listed on the menu card and can be removed in Customize.
              Leave it unticked for an <strong>add-on</strong> (an extra topping):
              add-ons never show on the menu, only under “Add-ons” in Customize.
            </p>
            <div className="mt-5 grid gap-4">
              {ingredients.map((ingredient) => (
                <article
                  key={ingredient.id}
                  className="rounded-md border border-border bg-background p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <strong>{ingredient.ingredient}</strong>
                    <Badge>Extra {money(ingredient.extra_price)} AED</Badge>
                    <Badge>
                      {ingredient.removable ? "Base · on menu" : "Add-on"}
                    </Badge>
                  </div>
                  <form
                    action={upsertCustomization}
                    className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_140px_120px]"
                  >
                    <input type="hidden" name="id" value={ingredient.id} />
                    <input type="hidden" name="product_id" value={product.id} />
                    <Field
                      label="Ingredient"
                      name="ingredient"
                      defaultValue={ingredient.ingredient}
                    />
                    <Field
                      label="Extra price"
                      name="extra_price"
                      type="number"
                      defaultValue={
                        ingredient.extra_price === null
                          ? ""
                          : Number(ingredient.extra_price)
                      }
                    />
                    <Field
                      label="Order"
                      name="position"
                      type="number"
                      defaultValue={ingredient.position}
                    />
                    <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm sm:col-span-2 lg:col-span-3">
                      <input
                        name="removable"
                        type="checkbox"
                        defaultChecked={ingredient.removable}
                      />
                      Base ingredient — show on the menu (customer can remove)
                    </label>
                    <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                      <SaveButton>Save ingredient</SaveButton>
                    </div>
                  </form>
                  <form action={deleteCustomization} className="mt-3">
                    <input type="hidden" name="id" value={ingredient.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                      Delete ingredient
                    </button>
                  </form>
                </article>
              ))}

              <form
                action={upsertCustomization}
                className="grid gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_140px_120px]"
              >
                <input type="hidden" name="product_id" value={product.id} />
                <Field label="Ingredient" name="ingredient" />
                <Field
                  label="Extra price"
                  name="extra_price"
                  type="number"
                  defaultValue="0"
                />
                <Field
                  label="Order"
                  name="position"
                  type="number"
                  defaultValue={ingredients.length}
                />
                <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm sm:col-span-2 lg:col-span-3">
                  <input name="removable" type="checkbox" defaultChecked />
                  Customer can remove
                </label>
                <div className="sm:col-span-2 lg:col-span-3">
                  <SaveButton>Add ingredient</SaveButton>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
