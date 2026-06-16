import Link from "next/link";
import { Logo } from "./Logo";

const cols = [
  {
    title: "Order",
    links: [
      { label: "Menu", href: "/menu" },
      { label: "Deals", href: "/deals" },
      { label: "Track Order", href: "/track" },
      { label: "Cart", href: "/cart" },
    ],
  },
  {
    title: "Napoli 7",
    links: [
      { label: "About", href: "/about" },
      { label: "Location", href: "/location" },
      { label: "Contact", href: "/contact" },
      { label: "Delivery", href: "/delivery" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQs", href: "/contact#faq" },
      { label: "Refund & Cancellation", href: "/legal/refund" },
      { label: "Privacy Policy", href: "/legal/privacy" },
      { label: "Terms & Conditions", href: "/legal/terms" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background pb-[88px] lg:pb-0">
      <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <Logo />
          <div className="mt-6 space-y-1 text-sm">
            <p>
              <a className="hover:underline" href="tel:+97165345772">
                Landline: +971 6 534 5772
              </a>
            </p>
            <p>
              <a className="hover:underline" href="https://wa.me/971501628577">
                WhatsApp 050 162 8577
              </a>
            </p>
            <p>
              <a className="hover:underline" href="mailto:info@napoli7.com">
                info@napoli7.com
              </a>
            </p>
          </div>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h3 className="font-display uppercase tracking-[0.2em] text-xs mb-5">
              {c.title}
            </h3>
            <ul className="space-y-3 text-sm">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="hover:underline underline-offset-4"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Italian flag micro-strip — single permitted block use of green/red */}
      <div className="max-w-[1500px] mx-auto px-6 md:px-10 pb-2">
        <div className="flag-strip" aria-hidden>
          <span className="g" />
          <span className="w" />
          <span className="r" />
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-[1500px] mx-auto px-6 md:px-10 py-6 flex flex-col md:flex-row justify-between gap-3 text-xs text-muted-foreground font-display">
          <p>© {year} Napoli 7. All rights reserved.</p>
          <p>*Offers available for takeout and delivery orders only.</p>
        </div>
      </div>
    </footer>
  );
}
