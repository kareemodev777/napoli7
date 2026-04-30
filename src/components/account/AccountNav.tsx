import Link from "next/link";
import { signOut } from "@/app/login/actions";

const links = [
  { href: "/account", label: "Dashboard" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/wishlist", label: "Wishlist" },
];

export function AccountNav({ current }: { current: string }) {
  return (
    <nav aria-label="Account navigation" className="space-y-1 sticky top-6">
      <ul className="border-t border-border">
        {links.map((l) => {
          const active = current === l.href;
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={
                  "block px-4 py-3 border-b border-border font-display text-xs tracking-[0.2em] uppercase " +
                  (active
                    ? "bg-brand text-primary-foreground"
                    : "hover:bg-muted")
                }
              >
                {l.label}
              </Link>
            </li>
          );
        })}
        <li>
          <form action={signOut}>
            <button
              type="submit"
              className="block w-full text-left px-4 py-3 border-b border-border font-display text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Log out
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
