"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Phone,
  MessageCircle,
  User,
} from "lucide-react";
import { Logo } from "./Logo";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { useRouteChange } from "@/lib/use-route-change";
import en from "@/i18n/en.json";

const navLinks = [
  { label: "Menu", href: "/menu" },
  { label: "Deals", href: "/deals" },
  { label: "About", href: "/about" },
  { label: "Track Order", href: "/track" },
  { label: "Location", href: "/location" },
  { label: "Contact", href: "/contact" },
];

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Track whether the drawer has ever been opened so we only return focus
  // to the trigger after an intentional open→close, not on initial mount.
  const hasOpenedRef = useRef(false);

  const close = useCallback(() => setOpen(false), []);

  useBodyScrollLock(open);
  useRouteChange(close);

  // Close drawer if the viewport crosses into desktop (≥ 1024px) while open.
  // Prevents body scroll lock persisting when lg:hidden hides the drawer.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    function handleChange(e: MediaQueryListEvent) {
      if (e.matches) setOpen(false);
    }
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  // Return focus to trigger only when drawer closes after having been open.
  // This preserves natural page focus (skip-link, etc.) on initial load.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
    } else if (hasOpenedRef.current) {
      triggerRef.current?.focus();
    }
  }, [open]);

  // Focus the close button (not the Logo link) when drawer opens.
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
  }, [open]);

  // Mark all page content except the drawer as inert while open so screen
  // readers cannot reach background content.
  useEffect(() => {
    const drawer = drawerRef.current;
    if (!drawer) return;

    const children = Array.from(document.body.children) as HTMLElement[];

    if (open) {
      children.forEach((el) => {
        if (!el.contains(drawer)) {
          el.setAttribute("inert", "");
        }
      });
    }

    return () => {
      children.forEach((el) => el.removeAttribute("inert"));
    };
  }, [open]);

  // ESC to close + focus trap inside the drawer.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const el = drawerRef.current;
      if (!el) return;
      const focusable = getFocusableElements(el);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  return (
    <>
      {/* Hamburger trigger — visible only < lg */}
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-nav-drawer"
        onClick={() => setOpen(true)}
        className="lg:hidden inline-flex items-center justify-center h-11 w-11 hover:opacity-60 transition-opacity"
      >
        <Menu className="h-5 w-5" strokeWidth={1.5} aria-hidden />
      </button>

      {/* Backdrop */}
      {open ? (
        <div
          aria-hidden
          onClick={close}
          className="lg:hidden fixed inset-0 z-40 bg-black/45"
          style={{
            animation:
              "mobileNavBackdropIn 180ms cubic-bezier(0.2,0,0,1) forwards",
          }}
        />
      ) : null}

      {/* Drawer */}
      <div
        id="mobile-nav-drawer"
        ref={drawerRef}
        data-mobile-nav
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        aria-hidden={!open}
        className={[
          "lg:hidden fixed inset-y-0 right-0 z-50 flex flex-col",
          "w-full max-w-[360px] bg-background border-l border-border",
          open ? "" : "pointer-events-none",
        ].join(" ")}
        style={{
          transform: open ? "translate3d(0,0,0)" : "translate3d(100%,0,0)",
          transition: open
            ? "transform 220ms cubic-bezier(0.2,0,0,1)"
            : "transform 180ms cubic-bezier(0.2,0,0,1)",
          visibility: open ? "visible" : "hidden",
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          {/* tabIndex={-1}: Logo is branding, not a nav target inside the drawer */}
          <Logo tabIndex={-1} />
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="inline-flex items-center justify-center h-11 w-11 border border-border hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        {/* Primary nav rows */}
        <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto">
          <ul>
            {navLinks.map((link) => (
              <li key={link.href} className="border-b border-border">
                <Link
                  href={link.href}
                  onClick={close}
                  className="flex items-center justify-between px-5 h-16 font-display text-3xl uppercase tracking-[1.5px] hover:bg-muted transition-colors"
                >
                  {link.label}
                  <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-border px-5 py-5 space-y-1">
          {/* Login / Account */}
          <Link
            href="/login"
            onClick={close}
            className="flex items-center gap-3 h-11 font-display text-sm uppercase tracking-[1.5px] hover:opacity-60 transition-opacity"
          >
            <User className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Login / Account
          </Link>

          {/* Language pill */}
          <button
            type="button"
            aria-label="Language"
            className="flex items-center gap-1 h-11 font-display text-sm uppercase tracking-[1.5px] hover:opacity-60 transition-opacity"
          >
            <span>EN</span>
            <ChevronDown className="h-3 w-3" strokeWidth={1.5} aria-hidden />
          </button>

          {/* Phone */}
          <a
            href="tel:+97165345772"
            className="flex items-center gap-3 h-11 font-display text-sm hover:opacity-60 transition-opacity"
            aria-label="Call us at +971 6 534 5772"
          >
            <Phone className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            +971 6 534 5772
          </a>

          {/* WhatsApp */}
          <a
            href="https://wa.me/971501628577"
            className="flex items-center gap-3 h-11 font-display text-sm hover:opacity-60 transition-opacity"
            aria-label="WhatsApp us at 050 162 8577"
          >
            <MessageCircle
              className="h-4 w-4 shrink-0"
              strokeWidth={1.5}
              aria-hidden
            />
            WhatsApp 050 162 8577
          </a>

          {/* Hours */}
          <p className="font-display text-xs text-muted-foreground uppercase tracking-[1px] pt-1">
            {en.brand.hours}
          </p>
        </div>
      </div>

    </>
  );
}
