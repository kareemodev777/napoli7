import { SiteShell } from "@/components/site/SiteShell";
import { requireAdmin } from "@/lib/auth/require-admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <SiteShell>{children}</SiteShell>;
}
