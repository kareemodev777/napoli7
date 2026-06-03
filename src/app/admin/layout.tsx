import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth/require-admin";
import { signOut } from "@/app/login/actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <main id="main" className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/70 px-4 py-4 md:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-4 md:grid-cols-[minmax(220px,1fr)_auto] md:items-center">
          <div>
            <Link
              href="/admin/orders"
              className="font-display text-lg uppercase tracking-[0.22em] hover:text-muted-foreground"
            >
              Napoli 7 Admin
            </Link>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage orders, menu, delivery zones, and launch promotions.
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            <AdminNav />
            <form action={signOut}>
              <button
                type="submit"
                className="font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </main>
  );
}
