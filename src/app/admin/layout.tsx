import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { TestAlarmButton } from "@/components/admin/TestAlarmButton";
import { MessageToaster } from "@/components/admin/MessageToaster";
import { Toaster } from "@/components/ui/sonner";
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
      <div className="min-w-0 flex-1">
        {/* Floating notification — overlays the content at the top-right so it
            takes no vertical space and the page starts at the very top. Desktop
            only; mobile keeps the bell in the sidebar's own top bar. */}
        <div className="fixed right-4 top-4 z-30 hidden items-center gap-2 md:flex">
          <TestAlarmButton />
          <NotificationBell initialCount={actionableOrders} variant="compact" />
        </div>
        {children}
      </div>
      <MessageToaster />
      <Toaster />
    </main>
  );
}
