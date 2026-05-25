import Link from "next/link";
import { SiteShell } from "@/components/site/SiteShell";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <SiteShell>
      <nav className="border-b border-border bg-muted/30 px-6 md:px-10">
        <div className="mx-auto flex max-w-[1400px] gap-6 py-3 font-display text-xs uppercase tracking-[0.18em]">
          <Link href="/admin/orders" className="hover:text-muted-foreground">
            Orders
          </Link>
          <Link href="/admin/catalog" className="hover:text-muted-foreground">
            Catalog
          </Link>
        </div>
      </nav>
      {children}
    </SiteShell>
  );
}
