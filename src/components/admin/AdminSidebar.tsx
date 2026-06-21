"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AdminNav } from "./AdminNav";
import { NotificationBell } from "./NotificationBell";
import { signOut } from "@/app/login/actions";

/**
 * Admin navigation as a left sidebar: a sticky full-height rail on desktop, and
 * a slide-in drawer (toggled from a compact top bar) on mobile. The nav itself
 * lives in AdminNav; this wraps it with the brand, notification bell, log out,
 * and the mobile open/close behaviour.
 */
export function AdminSidebar({
  actionableOrders,
}: {
  actionableOrders: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar — only shown when the sidebar is collapsed off-canvas. */}
      <div className="flex items-center justify-between border-b border-border bg-card/70 px-4 py-3 md:hidden">
        <Link
          href="/admin/orders"
          className="font-display text-base uppercase tracking-[0.2em] hover:text-muted-foreground"
        >
          Napoli 7 Admin
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell initialCount={actionableOrders} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-muted"
          >
            <Menu className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>
      </div>

      {/* Mobile overlay behind the drawer. */}
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
          role="presentation"
        />
      ) : null}

      <aside
        aria-label="Admin sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card px-4 py-6 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link
              href="/admin/orders"
              onClick={() => setOpen(false)}
              className="font-display text-lg uppercase tracking-[0.2em] hover:text-muted-foreground"
            >
              Napoli 7 Admin
            </Link>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">
              Manage orders, menu, delivery, and promotions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground md:hidden"
          >
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="mt-4 hidden md:block">
          <NotificationBell initialCount={actionableOrders} />
        </div>

        <div className="mt-6 flex-1 overflow-y-auto">
          <AdminNav onNavigate={() => setOpen(false)} />
        </div>

        <form action={signOut} className="mt-4 border-t border-border pt-4">
          <button
            type="submit"
            className="font-display text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </aside>
    </>
  );
}
