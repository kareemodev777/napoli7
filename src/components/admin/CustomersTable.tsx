"use client";

import { useState } from "react";
import Link from "next/link";
import type { DerivedCustomer } from "@/lib/admin/customers";
import { formatDate } from "@/lib/format-date";

export function CustomersTable({ customers }: { customers: DerivedCustomer[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(key: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left font-display text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <th className="w-8 px-4 py-3 font-medium" />
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium text-right">Orders</th>
            <th className="px-4 py-3 font-medium text-right">Total spent</th>
            <th className="px-4 py-3 font-medium">Last order</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const isOpen = open.has(customer.key);
            return (
              <CustomerRows
                key={customer.key}
                customer={customer}
                isOpen={isOpen}
                onToggle={() => toggle(customer.key)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CustomerRows({
  customer,
  isOpen,
  onToggle,
}: {
  customer: DerivedCustomer;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/30"
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-muted-foreground">
          <span
            className="inline-block transition-transform"
            style={{ transform: isOpen ? "rotate(90deg)" : "none" }}
            aria-hidden
          >
            ▸
          </span>
        </td>
        <td className="px-4 py-3 font-medium">{customer.name}</td>
        <td className="px-4 py-3">
          <TypeBadge registered={customer.isRegistered} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {customer.email ? (
            <a
              href={`mailto:${customer.email}`}
              className="block hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.email}
            </a>
          ) : null}
          {customer.phone ? (
            <a
              href={`tel:${customer.phone}`}
              className="block text-xs hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {customer.phone}
            </a>
          ) : null}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {customer.orderCount}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {customer.totalSpentAed.toFixed(2)} AED
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {formatDate(customer.lastOrderAt, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>
      </tr>
      {isOpen ? (
        <tr className="border-b border-border bg-muted/20 last:border-b-0">
          <td />
          <td colSpan={6} className="px-4 py-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left font-display uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-1.5 pr-4 font-medium">Order</th>
                  <th className="py-1.5 pr-4 font-medium">Date</th>
                  <th className="py-1.5 pr-4 font-medium">Status</th>
                  <th className="py-1.5 pr-4 font-medium">Payment</th>
                  <th className="py-1.5 pr-4 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => (
                  <tr key={o.id} className="border-t border-border/60">
                    <td className="py-1.5 pr-4 font-display tabular-nums">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="underline decoration-dotted underline-offset-4 hover:text-azure-deep"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {o.orderNumber ?? o.id.slice(0, 8)}
                      </Link>
                    </td>
                    <td className="py-1.5 pr-4 text-muted-foreground">
                      {formatDate(o.createdAt, {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-1.5 pr-4 capitalize">
                      {o.status?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-muted-foreground">
                      {[o.paymentMethod, o.paymentStatus]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums">
                      {o.totalAed.toFixed(2)} AED
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function TypeBadge({ registered }: { registered: boolean }) {
  return (
    <span
      className={
        "inline-flex items-center whitespace-nowrap rounded px-2 py-0.5 font-display text-[10px] uppercase tracking-[0.14em] " +
        (registered
          ? "bg-flag-green/15 text-flag-green"
          : "bg-muted text-muted-foreground")
      }
    >
      {registered ? "Account" : "Guest"}
    </span>
  );
}
