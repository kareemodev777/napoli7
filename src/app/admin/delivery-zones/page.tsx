import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Pencil, Plus } from "lucide-react";
import { DeleteZoneButton } from "./DeleteZoneButton";
import { Badge, ZoneForm, money } from "./form-components";
import {
  updateDeliveryMinimumSubtotal,
} from "./actions";
import type { DeliveryZoneRow } from "./types";
import { AdminModal } from "@/components/admin/AdminModal";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getDeliveryMinimumSubtotalAed } from "@/lib/delivery-settings";
import { formatAed } from "@/components/catalog/PriceBadge";

export const metadata: Metadata = {
  title: "Delivery Zones · Admin",
  alternates: { canonical: "/admin/delivery-zones" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadZones(): Promise<DeliveryZoneRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];

  const supabase = createServiceRoleClient();
  // Load ALL zones (including inactive) so the admin can see hidden areas.
  const { data } = await supabase
    .from("delivery_zones")
    .select("*")
    .order("position");

  return (data ?? []) as DeliveryZoneRow[];
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

function AddZoneModal() {
  return (
    <AdminModal
      title="Add delivery zone"
      description="Add an Ajman area and its flat delivery fee. Active zones appear in the checkout area picker."
      triggerLabel="Add delivery zone"
      triggerClassName="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
      trigger={<><Plus className="h-4 w-4" strokeWidth={1.7} />Zone</>}
    >
      <ZoneForm />
    </AdminModal>
  );
}

function EditZoneModal({ zone }: { zone: DeliveryZoneRow }) {
  return (
    <AdminModal
      title="Edit delivery zone"
      description="Rename the area, adjust its fee, reorder it, or hide it from checkout."
      triggerLabel={`Edit ${zone.area}`}
      triggerClassName="inline-flex h-10 w-10 items-center justify-center rounded-md"
      trigger={<IconButton label="Edit zone"><Pencil className="h-4 w-4" strokeWidth={1.7} /></IconButton>}
    >
      <ZoneForm zone={zone} />
    </AdminModal>
  );
}

export default async function AdminDeliveryZonesPage() {
  const [zones, deliveryMinSubtotalAed] = await Promise.all([
    loadZones(),
    getDeliveryMinimumSubtotalAed(),
  ]);
  const activeCount = zones.filter((zone) => zone.active).length;

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Delivery Zones
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set the per-area delivery fees shown at checkout.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{zones.length} zones</Badge>
            <Badge>{activeCount} active</Badge>
            <AddZoneModal />
          </div>
        </div>

        <div className="mt-8 rounded-md border border-border bg-card p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-display text-xl uppercase tracking-[0.14em]">
                Minimum delivery subtotal
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Delivery orders must meet this amount before the delivery fee is added.
              </p>
            </div>
            <Badge tone="active">Current {formatAed(deliveryMinSubtotalAed)}</Badge>
          </div>

          {HAS_SUPABASE_SERVICE ? (
            <form
              action={updateDeliveryMinimumSubtotal}
              className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <label className="grid gap-2 sm:min-w-[260px]">
                <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Minimum subtotal (AED)
                </span>
                <input
                  name="deliveryMinSubtotalAed"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={deliveryMinSubtotalAed}
                  className="h-11 rounded-md border border-border bg-background px-3 text-sm outline-none transition focus:border-brand"
                />
              </label>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-xs font-display uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
              >
                Save minimum
              </button>
            </form>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Supabase service environment is required to edit this value.
            </p>
          )}
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to manage delivery zones.
            Set the Supabase URL and service role key to enable this page.
          </div>
        ) : zones.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No delivery zones yet. Use Add zone to create your first area.
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-md border border-border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Area</th>
                  <th className="px-4 py-3 font-medium">Fee (AED)</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr
                    key={zone.area}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-display uppercase tracking-[0.06em]">
                      {zone.area}
                    </td>
                    <td className="px-4 py-3">{money(zone.fee_aed)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      #{zone.position}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={zone.active ? "active" : "hidden"}>
                        {zone.active ? "Active" : "Hidden"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <EditZoneModal zone={zone} />
                        <DeleteZoneButton area={zone.area} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
