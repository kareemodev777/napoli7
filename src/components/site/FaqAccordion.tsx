"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  q: string;
  a: string;
  link?: { label: string; href: string };
}

interface FaqAccordionProps {
  items: FaqItem[];
  id?: string;
}

export function FaqAccordion({ items, id }: FaqAccordionProps) {
  return (
    <Accordion type="single" collapsible className="w-full" id={id}>
      {items.map((item, index) => (
        <AccordionItem
          key={item.q}
          value={`item-${index}`}
          className="border-border"
        >
          <AccordionTrigger className="font-display text-base md:text-lg font-medium text-left py-5 hover:no-underline">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-base text-muted-foreground leading-relaxed pb-6 max-w-[65ch]">
            {item.a}
            {item.link ? (
              <a
                href={item.link.href}
                target="_blank"
                rel="noopener"
                className="ml-1 text-foreground underline underline-offset-4 hover:text-brand"
              >
                {item.link.label}
              </a>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
