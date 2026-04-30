import Link from "next/link";

const items = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/refund", label: "Refund & Cancellation" },
];

interface LegalNavProps {
  current: "privacy" | "terms" | "refund";
}

export function LegalNav({ current }: LegalNavProps) {
  return (
    <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
      {items.map((item) => {
        const slug = item.href.split("/").pop() as LegalNavProps["current"];
        const active = slug === current;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "inline-flex items-center px-4 py-2 font-display text-xs tracking-[0.2em] uppercase border " +
              (active
                ? "bg-brand text-primary-foreground border-brand"
                : "border-border hover:border-foreground")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
