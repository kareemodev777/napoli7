import { BrandLoader } from "@/components/site/BrandLoader";

// Ancestor loading boundary for the whole admin segment — shows instantly on
// refresh or navigation between admin sections that don't define their own
// loading UI. Renders inside the admin layout, so the sidebar stays put.
export default function AdminLoading() {
  return <BrandLoader className="min-h-[70vh]" />;
}
