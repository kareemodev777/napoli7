"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { label: "Dashboard", href: "/admin", description: "Daily overview" },
  { label: "Orders", href: "/admin/orders", description: "Kitchen queue" },
  { label: "Catalog", href: "/admin/catalog", description: "Menu, prices, images" },
  { label: "Delivery", href: "/admin/delivery-zones", description: "Areas and fees" },
  { label: "Promos", href: "/admin/promos", description: "Discount codes" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className="flex gap-2 overflow-x-auto pb-1 md:justify-end md:pb-0"
    >
      {adminLinks.map((link) => {
        const active = isActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`group min-w-[136px] rounded-md border px-4 py-3 transition-colors ${
              active
                ? "border-brand bg-brand text-primary-foreground"
                : "border-border bg-background text-foreground hover:border-brand/40 hover:bg-muted/60"
            }`}
          >
            <span className="block font-display text-xs uppercase tracking-[0.18em]">
              {link.label}
            </span>
            <span
              className={`mt-1 block text-[11px] leading-4 ${
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
