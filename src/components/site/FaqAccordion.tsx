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
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
