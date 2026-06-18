import type { ReactNode } from "react";
import { SIZE_OPTIONS, type SizeId } from "@/data/types/catalog";
import { upsertProduct } from "./actions";
import { ImageUploadField } from "./ImageUploadField";
import type { CategoryRow, ProductRow } from "./types";

export function money(value: string | number | null) {
  if (value === null) return "0";
  return Number(value).toFixed(0);
}

export function Field({
  label,
  name,
  defaultValue = "",
  type = "text",
  required = false,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="min-h-5 font-medium text-foreground">{label}</span>
      <input
        name={name}
        type={type}
        step={type === "number" ? "any" : undefined}
        required={required}
        defaultValue={defaultValue ?? ""}
        className="h-11 w-full rounded-md border border-border bg-background pl-3 pr-8 text-sm text-foreground"
      />
      {hint ? (
        <span className="min-h-8 text-xs leading-4 text-muted-foreground">
          {hint}
        </span>
      ) : (
        <span className="min-h-8" aria-hidden="true" />
      )}
    </label>
  );
}

export function SizeSelect({
  defaultValue = "regular",
}: {
  defaultValue?: SizeId;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="min-h-5 font-medium text-foreground">Size</span>
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
      <span className="min-h-8" aria-hidden="true" />
    </label>
  );
}

export function TextArea({
  label,
  name,
  defaultValue = "",
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm md:col-span-2 lg:col-span-full">
      <span className="min-h-5 font-medium text-foreground">{label}</span>
      <textarea
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        rows={4}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
    </label>
  );
}

export function SelectCategory({
  categories,
  defaultValue,
}: {
  categories: CategoryRow[];
  defaultValue?: string;
}) {
  return (
    <label className="grid min-w-0 gap-1 text-sm">
      <span className="min-h-5 font-medium text-foreground">Category</span>
      <select
        name="category_id"
        defaultValue={defaultValue}
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
      <span className="min-h-8" aria-hidden="true" />
    </label>
  );
}

export function SaveButton({ children = "Save" }: { children?: ReactNode }) {
  return (
    <button
      type="submit"
      className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 font-display text-xs uppercase tracking-[0.16em] text-primary-foreground hover:bg-brand-hover"
    >
      {children}
    </button>
  );
}

export function DeleteButton({ label = "Delete" }: { label?: string }) {
  return (
    <button
      type="submit"
      className="inline-flex h-10 items-center justify-center rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive hover:text-destructive-foreground"
    >
      {label}
    </button>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export function ProductForm({
  product,
  categories,
  showImageUpload = true,
}: {
  product?: ProductRow;
  categories: CategoryRow[];
  showImageUpload?: boolean;
}) {
  return (
    <form action={upsertProduct} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <Field
        label="Item name"
        name="name"
        defaultValue={product?.name}
        required
      />
      <Field
        label="Italian name"
        name="name_it"
        defaultValue={product?.name_it}
      />
      <SelectCategory categories={categories} defaultValue={product?.category_id} />
      <Field
        label="Website link name"
        name="slug"
        defaultValue={product?.slug}
        required
        hint="Use simple lowercase words with hyphens, like margherita-classic."
      />
      <TextArea
        label="Menu description"
        name="description"
        defaultValue={product?.description}
        required
      />
      <Field
        label="Main price"
        name="price_aed"
        type="number"
        defaultValue={product ? Number(product.price_aed) : 0}
        required
      />
      {showImageUpload ? (
        <ImageUploadField
          defaultValue={product?.image_url ?? ""}
          productId={product?.id}
          slug={product?.slug}
        />
      ) : (
        <input type="hidden" name="image_url" value={product?.image_url ?? ""} />
      )}
      <Field
        label="Display order"
        name="position"
        type="number"
        defaultValue={product?.position ?? 0}
      />
      <div className="flex flex-wrap items-end gap-3 text-sm md:col-span-2 lg:col-span-full">
        <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3">
          <input name="is_veg" type="checkbox" defaultChecked={product?.is_veg ?? true} />
          Vegetarian
        </label>
        <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3">
          <input name="is_spicy" type="checkbox" defaultChecked={product?.is_spicy ?? false} />
          Spicy
        </label>
        <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3">
          <input
            name="is_temporarily_unavailable"
            type="checkbox"
            defaultChecked={product?.is_temporarily_unavailable ?? false}
          />
          Pizza not available
        </label>
        <label className="inline-flex h-11 items-center gap-2 rounded-md border border-border px-3">
          <input name="is_active" type="checkbox" defaultChecked={product?.is_active ?? true} />
          Show on menu
        </label>
        <SaveButton>{product ? "Save item" : "Add item"}</SaveButton>
      </div>
    </form>
  );
}
