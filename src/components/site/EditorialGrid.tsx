import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

interface Article {
  href: string;
  img: string;
  alt: string;
  title: string;
  titleNode?: ReactNode;
  body: string;
}

const articles: Article[] = [
  {
    href: "/deals",
    img: "/images/article-welcome.jpg",
    alt: "Napoli 7 welcome offer — your first Margherita pizza on us",
    title: "Your first Neapolitan pizza is on us.",
    body: "Sign up at Napoli 7 and your first Margherita is free for pickup. One per person, available exclusively through the website. Upgrade to any other pizza by paying the difference.",
  },
  {
    href: "/about",
    img: "/images/article-lievito.jpg",
    alt: "Slow-fermented lievito madre sourdough, hand-stretched for Neapolitan pizza",
    titleNode: (
      <>
        <em className="italic">Lievito madre.</em> The slow art of dough.
      </>
    ),
    title: "Lievito madre. The slow art of dough.",
    body: "Caputo flour, slow-fermented sourdough, hand-stretched using schiaffo napoletano, finished in a 450°C oven. The result is a crust that's airy, charred, and unmistakably Neapolitan.",
  },
  {
    href: "/about",
    img: "/images/article-seven.jpg",
    alt: "Seven Neapolitan pizzas — the full Napoli 7 menu laid out",
    title: "Why seven pizzas? A philosophy of restraint.",
    body: "A short menu is a disciplined kitchen. Seven pizzas, every day, the same way. No shortcuts, no rotating specials. Just the seven, made well — that's the whole point of Napoli 7.",
  },
];

export function EditorialGrid() {
  return (
    <section className="px-6 md:px-10 py-20 md:py-28 max-w-[1500px] mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
        {articles.map((it) => (
          <article key={it.title} className="group">
            <Link href={it.href} className="block">
              <h2 className="font-display text-3xl md:text-[2.1rem] font-medium leading-[1.05] mb-5 group-hover:underline underline-offset-4 decoration-1 text-balance">
                {it.titleNode ?? it.title}
              </h2>
            </Link>
            <p className="text-base text-muted-foreground leading-relaxed mb-5 max-w-[42ch]">
              {it.body}
            </p>
            <Link
              href={it.href}
              className="inline-flex items-center gap-2 font-display text-sm border-b border-foreground pb-1 hover:opacity-60"
            >
              Read more
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Image
              src={it.img}
              alt={it.alt}
              width={800}
              height={600}
              loading="lazy"
              className="mt-8 w-full aspect-[4/3] object-cover"
            />
          </article>
        ))}
      </div>
    </section>
  );
}
