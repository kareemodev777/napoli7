import type { Metadata } from "next";
import { AdminModal } from "@/components/admin/AdminModal";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getOrderingAvailability, formatOrderingWindow } from "@/lib/ordering-hours";
import { OpeningHoursForm } from "./OpeningHoursForm";

export const metadata: Metadata = {
  title: "Opening hours · Admin",
};

const DAY_TONES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export default async function OpeningHoursAdminPage() {
  await requireAdmin();
  const availability = await getOrderingAvailability();

  return (
    <main className="min-h-screen bg-background text-foreground px-6 md:px-10 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-3">
          <p className="font-display text-xs tracking-[0.25em] uppercase text-azure-deep">
            Admin
          </p>
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-[0.08em]">
            Opening hours
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            This controls whether ordering is open or closed. Menu browsing stays on,
            but checkout is blocked when the restaurant is closed.
          </p>
        </header>

        <section className="border border-border bg-card p-5 md:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xs tracking-[0.25em] uppercase text-foreground">
                Live status
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{availability.message}</p>
            </div>
            <div className="rounded-full border border-border px-4 py-2 text-xs font-display tracking-[0.2em] uppercase">
              {availability.isOpen ? "Open now" : "Closed now"}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Time zone: {availability.timezone}
          </p>
        </section>

        <section className="grid gap-4">
          {availability.hours.map((day) => (
            <article
              key={day.dayOfWeek}
              className="border border-border bg-card p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-display text-lg uppercase tracking-[0.08em]">
                  {DAY_TONES[day.dayOfWeek]}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {formatOrderingWindow(day)}
                </p>
                {day.note ? (
                  <p className="mt-1 text-xs text-muted-foreground">{day.note}</p>
                ) : null}
              </div>

              <AdminModal
                trigger={<span>Edit</span>}
                triggerLabel={`Edit opening hours for ${DAY_TONES[day.dayOfWeek]}`}
                triggerClassName="inline-flex items-center justify-center border border-foreground px-4 py-3 font-display text-xs tracking-[0.2em] uppercase hover:bg-foreground hover:text-background"
                title={`${DAY_TONES[day.dayOfWeek]} hours`}
                description="Update the hours that control whether checkout is open or closed."
              >
                <OpeningHoursForm day={day} />
              </AdminModal>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
