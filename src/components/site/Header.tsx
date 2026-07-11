import Link from "next/link";
import { Logo } from "./Logo";
import { CartIcon } from "@/components/cart/CartIcon";
import { MobileNav } from "./MobileNav";
import { AuthMenu } from "./AuthMenu";
import { navLinks } from "./nav-links";

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
        {/* Account / Sign in — hidden on mobile (lives in drawer footer) */}
        <AuthMenu />
        {/* Cart icon — desktop only; mobile cart lives in bottom bar */}
        <CartIcon />
        {/* Hamburger — mobile only */}
        <MobileNav />
      </div>
    </header>
  );
}
