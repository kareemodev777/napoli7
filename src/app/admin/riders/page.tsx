import type { Metadata } from "next";
import { Pencil, Plus } from "lucide-react";
import { Badge, RiderForm } from "./form-components";
import { DeleteRiderButton, RiderActiveToggle } from "./RiderRowActions";
import type { RiderRow } from "./types";
import { AdminModal } from "@/components/admin/AdminModal";
import { HAS_SUPABASE_SERVICE } from "@/lib/env";
import { createServiceRoleClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Riders · Admin",
  alternates: { canonical: "/admin/riders" },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadRiders(): Promise<RiderRow[]> {
  if (!HAS_SUPABASE_SERVICE) return [];
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("riders")
    .select("id, name, phone, vehicle, is_active, created_at")
    .order("is_active", { ascending: false })
    .order("name");
  return (data ?? []) as RiderRow[];
}

function AddRiderModal() {
  return (
    <AdminModal
      title="Register rider"
      description="Add a delivery rider. Active riders can be assigned to delivery orders, and the order brief is sent to this number over WhatsApp."
      triggerLabel="Register rider"
      triggerClassName="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-3 font-display text-xs uppercase tracking-[0.14em] text-primary-foreground hover:bg-brand-hover"
      trigger={
        <>
          <Plus className="h-4 w-4" strokeWidth={1.7} />
          Rider
        </>
      }
    >
      <RiderForm />
    </AdminModal>
  );
}

function EditRiderModal({ rider }: { rider: RiderRow }) {
  return (
    <AdminModal
      title="Edit rider"
      description="Update the rider's name, WhatsApp number, or vehicle."
      triggerLabel={`Edit ${rider.name}`}
      triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
      trigger={<Pencil className="h-4 w-4" strokeWidth={1.7} />}
    >
      <RiderForm rider={rider} />
    </AdminModal>
  );
}

export default async function AdminRidersPage() {
  const riders = await loadRiders();
  const activeCount = riders.filter((r) => r.is_active).length;

  return (
    <section className="px-4 py-8 md:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl uppercase tracking-[1.5px] md:text-4xl">
              Riders
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Register the drivers you assign to delivery orders.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{riders.length} riders</Badge>
            <Badge>{activeCount} active</Badge>
            <AddRiderModal />
          </div>
        </div>

        {!HAS_SUPABASE_SERVICE ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            Supabase service environment is required to manage riders. Set the
            Supabase URL and service role key to enable this page.
          </div>
        ) : riders.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
            No riders yet. Use Register rider to add your first driver.
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">WhatsApp</th>
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {riders.map((rider) => (
                  <tr
                    key={rider.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <td className="px-4 py-3 font-display uppercase tracking-[0.06em]">
                      {rider.name}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${rider.phone}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {rider.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {rider.vehicle ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={rider.is_active ? "active" : "hidden"}>
                        {rider.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <RiderActiveToggle
                          id={rider.id}
                          isActive={rider.is_active}
                        />
                        <EditRiderModal rider={rider} />
                        <DeleteRiderButton id={rider.id} name={rider.name} />
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
