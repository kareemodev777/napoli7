"use client";

import Link from "next/link";
import { Popover } from "radix-ui";
import {
  Bell,
  BellOff,
  ClipboardList,
  ChevronRight,
  MessageSquareText,
} from "lucide-react";
import { useAdminNotifications } from "./AdminNotificationsProvider";
import { formatAed } from "@/components/catalog/PriceBadge";

/**
 * Floating admin notification dropdown. The trigger shows a combined badge
 * (orders awaiting acceptance + unread messages); the panel breaks it down into
 * an Orders and a Messages section with the latest items, and silences the
 * repeating new-order alarm. Live data comes from AdminNotificationsProvider.
 */
export function NotificationBell() {
  const { snapshot, pulse, silenced, silence } = useAdminNotifications();
  const total = snapshot.orders + snapshot.messages;
  const ringing = snapshot.unacknowledgedOrders > 0 && !silenced;

  return (
    <Popover.Root onOpenChange={(open) => open && silence()}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Notifications: ${snapshot.orders} orders, ${snapshot.messages} messages`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
        >
          {pulse ? (
            <span
              aria-hidden
              className="absolute inset-0 rounded-md bg-flag-red/30 animate-ping"
            />
          ) : null}
          <Bell
            className={`relative h-4 w-4 ${ringing ? "text-brand" : ""}`}
            strokeWidth={1.7}
            aria-hidden
          />
          {total > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-display leading-[18px] tabular-nums text-primary-foreground">
              {total > 99 ? "99+" : total}
            </span>
          ) : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-display text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Notifications
            </span>
            {ringing ? (
              <button
                type="button"
                onClick={silence}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-display text-[10px] uppercase tracking-[0.14em] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <BellOff className="h-3 w-3" strokeWidth={1.8} aria-hidden />
                Silence
              </button>
            ) : null}
          </div>

          <Section
            href="/admin/orders"
            icon={ClipboardList}
            title="Orders to accept"
            count={snapshot.orders}
            emptyLabel="No orders waiting"
          >
            {snapshot.recentOrders.map((o) => (
              <Popover.Close asChild key={o.id}>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-display tracking-[0.06em]">
                      {o.orderNumber}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      · {o.customerName}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatAed(o.totalAed)}
                  </span>
                </Link>
              </Popover.Close>
            ))}
          </Section>

          <div className="my-2 border-t border-border" />

          <Section
            href="/admin/messages"
            icon={MessageSquareText}
            title="New messages"
            count={snapshot.messages}
            emptyLabel="No new messages"
          >
            {snapshot.recentMessages.map((m) => (
              <Popover.Close asChild key={m.id}>
                <Link
                  href="/admin/messages"
                  className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span className="block truncate font-display tracking-[0.04em]">
                    {m.name}
                  </span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {m.preview}
                  </span>
                </Link>
              </Popover.Close>
            ))}
          </Section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function Section({
  href,
  icon: Icon,
  title,
  count,
  emptyLabel,
  children,
}: {
  href: string;
  icon: typeof ClipboardList;
  title: string;
  count: number;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between px-1 py-1">
        <span className="inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.12em]">
          <Icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.7} aria-hidden />
          {title}
          {count > 0 ? (
            <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-[18px] tabular-nums text-primary-foreground">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
        <Popover.Close asChild>
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-[11px] font-display uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
          >
            View
            <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.7} aria-hidden />
          </Link>
        </Popover.Close>
      </div>
      {count > 0 ? (
        <div className="mt-0.5">{children}</div>
      ) : (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>
      )}
    </div>
  );
}
