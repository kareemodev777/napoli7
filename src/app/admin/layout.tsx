import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { requireAdmin } from "@/lib/auth/require-admin";
import { countActionableOrders } from "@/lib/admin/orders";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  const actionableOrders = await countActionableOrders();

  return (
    <main
      id="main"
      className="min-h-screen bg-background text-foreground md:flex"
    >
      <AdminSidebar actionableOrders={actionableOrders} />
      <div className="min-w-0 flex-1">{children}</div>
    </main>
  );
}
