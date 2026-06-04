import { AdminStatsSkeleton } from "@/components/admin/AdminSkeleton";

// Ancestor loading boundary for the whole admin segment — shows instantly on
// navigation between admin sections that don't define their own loading UI.
export default function AdminLoading() {
  return <AdminStatsSkeleton />;
}
