"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bike,
  ClipboardList,
  Clock,
  Image as ImageIcon,
  LayoutDashboard,
  Map,
  MessageSquareText,
  Pizza,
  TicketPercent,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useAdminNotifications } from "./AdminNotificationsProvider";

interface NavItem {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

// Grouped by how the kitchen actually works a shift: live operations first,
// then the people they serve, the menu they sell, and the storefront config
// that changes rarely. The section labels encode that real separation.
const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Today",
    items: [
      { label: "Dashboard", href: "/admin", description: "Daily overview", icon: LayoutDashboard },
      { label: "Orders", href: "/admin/orders", description: "Kitchen queue", icon: ClipboardList },
      { label: "POS", href: "/admin/pos", description: "Catalog check & push log", icon: Terminal },
      { label: "Riders", href: "/admin/riders", description: "Delivery drivers", icon: Bike },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Customers", href: "/admin/customers", description: "Order history", icon: Users },
      { label: "Messages", href: "/admin/messages", description: "Contact form log", icon: MessageSquareText },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "Catalog", href: "/admin/catalog", description: "Menu, prices, images", icon: Pizza },
      { label: "Site images", href: "/admin/site-images", description: "Hero & page photos", icon: ImageIcon },
    ],
  },
  {
    label: "Storefront",
    items: [
      { label: "Delivery", href: "/admin/delivery-zones", description: "Areas and fees", icon: Map },
      { label: "Opening hours", href: "/admin/opening-hours", description: "Checkout availability", icon: Clock },
      { label: "Promos", href: "/admin/promos", description: "Discount codes", icon: TicketPercent },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { snapshot } = useAdminNotifications();

  // Live badge counts for the operational nav items.
  const badgeFor = (href: string): number => {
    if (href === "/admin/orders") return snapshot.orders;
    if (href === "/admin/messages") return snapshot.messages;
    return 0;
  };

  return (
    <nav aria-label="Admin navigation" className="flex flex-col gap-6">
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <h2 className="px-3 pb-1 font-display text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70">
            {group.label}
          </h2>
          {group.items.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            const badge = badgeFor(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                  active
                    ? "bg-brand-soft text-brand-deep"
                    : "text-foreground hover:bg-muted/60"
                }`}
              >
                {/* Active rail — a single navy mark, the sharp Swiss accent. */}
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-brand transition-opacity ${
                    active ? "opacity-100" : "opacity-0"
                  }`}
                />
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
                  }`}
                  strokeWidth={1.7}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xs uppercase tracking-[0.14em]">
                    {link.label}
                  </span>
                  <span
                    className={`mt-0.5 block truncate text-[11px] leading-4 ${
                      active ? "text-brand/70" : "text-muted-foreground"
                    }`}
                  >
                    {link.description}
                  </span>
                </span>
                {badge > 0 ? (
                  <span className="ml-auto inline-flex min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-display leading-5 tabular-nums text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
