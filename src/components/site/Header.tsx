import Link from "next/link";
import { User, ChevronDown } from "lucide-react";
import { Logo } from "./Logo";
import { CartIcon } from "@/components/cart/CartIcon";
import { MobileNav } from "./MobileNav";

const navLinks = [
  { label: "Menu", href: "/menu" },
  { label: "Deals", href: "/deals" },
  { label: "About", href: "/about" },
  { label: "Track Order", href: "/track" },
  { label: "Location", href: "/location" },
  { label: "Contact", href: "/contact" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-background px-6 md:px-10 py-3 lg:py-5 flex items-center justify-between border-b border-border/60">
      <div className="flex items-center gap-10 lg:gap-14">
        <Logo />
        <nav className="hidden lg:flex items-center gap-8 font-display text-[0.95rem]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:opacity-60 transition-opacity"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-3 md:gap-5 lg:gap-6 font-display text-sm">
        {/* Language toggle — hidden on mobile (lives in drawer footer) */}
        <button
          type="button"
          className="hidden md:flex items-center gap-1 hover:opacity-60"
          aria-label="Language"
        >
          EN <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
        </button>
        {/* Account icon — hidden on mobile (lives in drawer footer) */}
        <Link
          href="/account"
          aria-label="Account"
          className="hidden lg:inline-flex hover:opacity-60"
        >
          <User className="h-5 w-5" strokeWidth={1.5} />
        </Link>
        {/* Cart icon — desktop only; mobile cart lives in bottom bar */}
        <CartIcon />
        {/* Hamburger — mobile only */}
        <MobileNav />
      </div>
    </header>
  );
}
