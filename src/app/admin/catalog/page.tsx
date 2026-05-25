import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, deleteProduct, upsertCategory } from "./actions";
import {
  Badge,
  DeleteButton,
  Field,
  ProductForm,
  SaveButton,
  money,
} from "./form-components";
import type { CategoryRow, ProductRow } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Catalog · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadCatalog() {
  if (!HAS_SUPABASE_SERVICE) {
    return { categories: [], products: [] };
  }

  const supabase = createServiceRoleClient();
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").order("position"),
    supabase
      .from("products")
      .select("*, product_sizes(*), product_customizations(*)")
      .order("category_id")
      .order("position"),
  ]);

  return {
    categories: (categories ?? []) as CategoryRow[],
    products: (products ?? []) as ProductRow[],
  };
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted">
      <span className="sr-only">{label}</span>
      {children}
    </span>
  );
}

function AddCategoryModal({ count }: { count: number }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={1.7} />
          Category
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-[0.08em]">
            Add category
          </DialogTitle>
          <DialogDescription>
            Create a menu group such as Pizza, Dessert, or Drinks.
          </DialogDescription>
        </DialogHeader>
        <form action={upsertCategory} className="grid gap-3">
          <Field label="Category name" name="label" required />
          <Field
            label="Short ID"
            name="id"
            required
            hint="Example: pasta, salad, drinks."
          />
          <Field label="Description" name="description" />
          <Field
            label="Display order"
            name="position"
            type="number"
            defaultValue={count}
          />
          <SaveButton>Add category</SaveButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AddProductModal({ categories }: { categories: CategoryRow[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
        >
          <Plus className="h-4 w-4" strokeWidth={1.7} />
          Item
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl uppercase tracking-[0.08em]">
            Add menu item
          </DialogTitle>
          <DialogDescription>
            Add the basic details first. Prices and ingredients can be edited
            from the item page after it is created.
          </DialogDescription>
        </DialogHeader>
        <ProductForm categories={categories} />
      </DialogContent>
    </Dialog>
  );
}

export default async function AdminCatalogPage() {
  const { categories, products } = await loadCatalog();
  const categoryName = new Map(categories.map((c) => [c.id, c.label]));

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Catalog
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Browse the menu, then open an item to edit its full details.
            </p>
          </div>
          <div className="flex gap-2">
            <Badge>{categories.length} categories</Badge>
            <Badge>{products.length} items</Badge>
          </div>
        </div>

        <div className="mt-8 grid gap-8">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Categories
              </h2>
              <AddCategoryModal count={categories.length} />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categories.map((category) => (
                <article
                  key={category.id}
                  className="rounded-md border border-border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg uppercase tracking-[0.08em]">
                        {category.label}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {category.description || "No description yet."}
                      </p>
                    </div>
                    <Badge>#{category.position}</Badge>
                  </div>
                  <details className="mt-4 rounded-md border border-border bg-background">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-display text-sm uppercase tracking-[0.14em] [&::-webkit-details-marker]:hidden">
                      <span>Edit category</span>
                      <Pencil className="h-4 w-4" strokeWidth={1.7} />
                    </summary>
                    <div className="border-t border-border p-4">
                      <form action={upsertCategory} className="grid gap-3">
                        <Field
                          label="Category name"
                          name="label"
                          defaultValue={category.label}
                          required
                        />
                        <Field
                          label="Short ID"
                          name="id"
                          defaultValue={category.id}
                          required
                          hint="This is used in links. Keep it short, like pizza."
                        />
                        <Field
                          label="Description"
                          name="description"
                          defaultValue={category.description}
                        />
                        <Field
                          label="Display order"
                          name="position"
                          type="number"
                          defaultValue={category.position}
                        />
                        <SaveButton />
                      </form>
                      <form action={deleteCategory} className="mt-3">
                        <input type="hidden" name="id" value={category.id} />
                        <DeleteButton label="Delete category" />
                      </form>
                    </div>
                  </details>
                </article>
              ))}

            </div>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-xl uppercase tracking-[1px]">
                Menu items
              </h2>
              <AddProductModal categories={categories} />
            </div>

            <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const sizes = product.product_sizes ?? [];
                const ingredients = product.product_customizations ?? [];

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-md border border-border bg-card"
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={product.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span
                        className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-xs ${
                          product.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {product.is_active ? "Visible" : "Hidden"}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {categoryName.get(product.category_id) ?? product.category_id}
                          </p>
                          <h3 className="mt-1 line-clamp-2 font-display text-xl uppercase tracking-[0.08em]">
                            {product.name}
                          </h3>
                          {product.name_it ? (
                            <p className="truncate text-sm italic text-muted-foreground">
                              {product.name_it}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Link href={`/admin/catalog/${product.id}`} aria-label={`Edit ${product.name}`}>
                            <IconButton label="Edit item">
                              <Pencil className="h-4 w-4" strokeWidth={1.7} />
                            </IconButton>
                          </Link>
                          <form action={deleteProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <button
                              type="submit"
                              aria-label={`Delete ${product.name}`}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-destructive/40 bg-background text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                            </button>
                          </form>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
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
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
