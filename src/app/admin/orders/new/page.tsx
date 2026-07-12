import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createClient } from "@/lib/supabase/server";
import { getDeliveryZones } from "@/lib/checkout";
import { ManualOrderForm } from "@/components/admin/ManualOrderForm";

export const metadata: Metadata = { title: "New phone order" };

export default async function NewOrderPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: products }, zones] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, name, price_aed, is_active, is_temporarily_unavailable, product_sizes(size_id, label, price_aed)",
      )
      .eq("is_active", true)
      .order("name"),
    getDeliveryZones(),
  ]);

  const options = (products ?? [])
    .filter((p) => !p.is_temporarily_unavailable)
    .map((p) => {
      const sizes = (p.product_sizes ?? []).map(
        (s: { size_id: string; label: string; price_aed: number | string }) => ({
          sizeId: s.size_id,
          label: s.label,
          priceAed: Number(s.price_aed),
        }),
      );
      return {
        id: p.id,
        name: p.name,
        // A product with no size rows is sold as a single "Regular" at its own
        // price — the same rule the menu uses.
        sizes: sizes.length
          ? sizes
          : [
              {
                sizeId: "regular",
                label: "Regular",
                priceAed: Number(p.price_aed),
              },
            ],
      };
    });

  return (
    <div className="p-6 md:p-10 max-w-4xl">
      <Link
        href="/admin/orders"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to orders
      </Link>
      <h1 className="mt-3 font-display text-2xl md:text-3xl uppercase tracking-[1.5px]">
        New phone order
      </h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-[60ch]">
        For an order taken over the phone. It becomes an ordinary order — same
        order number, same kitchen ticket, same POS push — so you can prepare it,
        assign a rider and track it exactly like one placed on the website.
      </p>

      <div className="mt-8">
        <ManualOrderForm
          products={options}
          areas={zones.map((z) => z.area)}
        />
      </div>
    </div>
  );
}
