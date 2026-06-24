"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Dashboard", href: "/admin", description: "Daily overview" },
  { label: "Orders", href: "/admin/orders", description: "Kitchen queue" },
  { label: "POS", href: "/admin/pos", description: "Catalog check & push log" },
  { label: "Riders", href: "/admin/riders", description: "Delivery drivers" },
  { label: "Customers", href: "/admin/customers", description: "Order history" },
  { label: "Catalog", href: "/admin/catalog", description: "Menu, prices, images" },
  { label: "Site images", href: "/admin/site-images", description: "Hero & page photos" },
  { label: "Delivery", href: "/admin/delivery-zones", description: "Areas and fees" },
  { label: "Opening hours", href: "/admin/opening-hours", description: "Checkout availability" },
  { label: "Promos", href: "/admin/promos", description: "Discount codes" },
  { label: "Messages", href: "/admin/messages", description: "Contact form log" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-1">
      {adminLinks.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`group rounded-md border px-3 py-2.5 transition-colors ${
              active
                ? "border-brand bg-brand text-primary-foreground"
                : "border-transparent text-foreground hover:border-brand/40 hover:bg-muted/60"
            }`}
          >
            <span className="block font-display text-xs uppercase tracking-[0.16em]">
              {link.label}
            </span>
            <span
              className={`mt-0.5 block text-[11px] leading-4 ${
                active ? "text-primary-foreground/75" : "text-muted-foreground"
              }`}
            >
              {link.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
