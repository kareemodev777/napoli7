import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { AccountNav } from "@/components/account/AccountNav";
import { LiveOrders } from "@/components/account/LiveOrders";
import { requireCustomerAccount } from "@/lib/auth/require-auth";
import { createClient } from "@/lib/supabase/server";
import { HAS_SUPABASE } from "@/lib/env";
import type { CartItemInput } from "@/store/cart";

export const metadata: Metadata = {
  title: "Orders",
  description: "Your Napoli 7 order history.",
  alternates: { canonical: "/account/orders" },
  robots: { index: false, follow: false },
};

interface OrderRow {
  id: string;
  orderNumber: string;
  totalAed: number;
  status:
    | "received"
    | "preparing"
    | "out_for_delivery"
    | "delivered"
    | "cancelled";
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: { product_name: string; quantity: number }[];
  reorderItems: CartItemInput[];
  reorderChangedCount: number;
  reorderUnavailableCount: number;
}

type OrderItemRow = {
  product_id: string;
  product_name: string;
  base_price_aed: number | string;
  quantity: number;
  customizations: CartItemInput["customizations"];
};

type ProductRow = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  name_it: string | null;
  image_url: string;
  price_aed: number | string;
  is_active: boolean;
  product_sizes?: Array<{
    size_id: "small" | "regular" | "large" | "family";
    label: string;
    detail: string;
    price_aed: number | string;
  }>;
};

function toReorderItem(
  item: OrderItemRow,
  product: ProductRow | undefined,
): { item: CartItemInput; changed: boolean } | null {
  if (!product || !product.is_active) return null;
  const basePrice = Number(item.base_price_aed);
  const sizes = product.product_sizes?.length
    ? product.product_sizes
    : [
        {
          size_id: "regular" as const,
          label: "Regular",
          detail: "",
          price_aed: product.price_aed,
        },
      ];
  const exactSize = sizes.find((size) => Number(size.price_aed) === basePrice);
  const matchedSize = exactSize ?? sizes.find((size) => size.size_id === "regular") ?? sizes[0];
  const extras = (item.customizations ?? []).reduce(
    (sum, customization) =>
      customization.choice === "extra" ? sum + customization.extraPrice : sum,
    0,
  );

  return {
    changed: !exactSize,
    item: {
      productId: item.product_id,
      categoryId: product.category_id,
      slug: product.slug,
      name: product.name,
      nameIt: product.name_it,
      basePrice: Number(matchedSize.price_aed),
      unitPrice: Number(matchedSize.price_aed) + extras,
      quantity: item.quantity,
      customizations: item.customizations ?? [],
      imageUrl: product.image_url,
      sizeId: matchedSize.size_id,
      sizeLabel: matchedSize.label,
      sizeDetail: matchedSize.detail,
    },
  };
}

async function loadOrders(userId: string): Promise<OrderRow[]> {
  if (!HAS_SUPABASE) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, total_aed, status, payment_method, payment_status, created_at, order_items(product_id, product_name, base_price_aed, quantity, customizations)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const productIds = [
    ...new Set(
      (data ?? []).flatMap((row) =>
        (row.order_items ?? []).map((item: OrderItemRow) => item.product_id),
      ),
    ),
  ];
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select(
          "id, category_id, slug, name, name_it, image_url, price_aed, is_active, product_sizes(size_id, label, detail, price_aed)",
        )
        .in("id", productIds)
    : { data: [] };
  const productsById = new Map(
    ((products ?? []) as ProductRow[]).map((product) => [product.id, product]),
  );

  return (data ?? []).map((row) => {
    const orderItems = (row.order_items ?? []) as OrderItemRow[];
    const reorderResults = orderItems.map((item) =>
      toReorderItem(item, productsById.get(item.product_id)),
    );
    return {
      id: row.id,
      orderNumber: row.order_number,
      totalAed: Number(row.total_aed),
      status: row.status,
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
      items: row.order_items ?? [],
      reorderItems: reorderResults
        .filter((result): result is { item: CartItemInput; changed: boolean } =>
          Boolean(result),
        )
        .map((result) => result.item),
      reorderChangedCount: reorderResults.filter((result) => result?.changed)
        .length,
      reorderUnavailableCount: reorderResults.filter((result) => !result)
        .length,
    };
  });
}

export default async function AccountOrdersPage() {
  const user = await requireCustomerAccount("/account/orders");
  const orders = await loadOrders(user.id);

  return (
    <SiteShell>
      <section className="px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1140px] mx-auto grid lg:grid-cols-[220px_1fr] gap-10">
          <AccountNav current="/account/orders" />
          <div>
            <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[1.5px] leading-tight">
              Orders
            </h1>
            {orders.length === 0 ? (
              <div className="mt-10 border border-border bg-card p-8">
                <p className="text-base">
                  No orders yet. Order your first pizza.
                </p>
                <Link
                  href="/menu"
                  className="mt-4 inline-flex items-center bg-brand text-primary-foreground px-6 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-brand-hover"
                >
                  View menu
                </Link>
              </div>
            ) : (
              <LiveOrders
                orders={orders.map((o) => ({
                  id: o.id,
                  orderNumber: o.orderNumber,
                  totalAed: o.totalAed,
                  status: o.status,
                  paymentMethod: o.paymentMethod,
                  paymentStatus: o.paymentStatus,
                  summary:
                    o.items.length === 0
                      ? "No items"
                      : `${o.items[0].quantity} × ${o.items[0].product_name}` +
                        (o.items.length > 1
                          ? ` + ${o.items.length - 1} more`
                          : ""),
                  reorderItems: o.reorderItems,
                  reorderChangedCount: o.reorderChangedCount,
                  reorderUnavailableCount: o.reorderUnavailableCount,
                }))}
              />
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
