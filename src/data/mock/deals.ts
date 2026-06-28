export interface Deal {
  slug: string;
  title: string;
  description: string;
  conditions: string[];
  cta: { label: string; href: string };
}

export const WELCOME_OFFER: Deal = {
  slug: "first-pizza-on-us",
  title: "Your first small Margherita is on us",
  description:
    "Sign up at Napoli 7 and your first small Margherita is complimentary — for pickup. Want a larger size or a different pizza? Just pay the price difference, and delivery unlocks.",
  conditions: [
    "Free small Margherita, for pickup.",
    "One per person.",
    "Exclusively via napoli7.com signup.",
    "Available for the first 1,000 who sign up ONLY!",
  ],
  cta: { label: "Create your account", href: "/register" },
};

export const SECONDARY_DEALS: Deal[] = [
  {
    slug: "weekday-lunch",
    title: "Weekday lunch",
    description:
      "Any pizza plus a soft drink for a fixed price, Monday to Thursday between 12:00 and 15:00.",
    conditions: [
      "Pickup or delivery within Al Jurf 2.",
      "Cannot be combined with other offers.",
    ],
    cta: { label: "View Menu", href: "/menu" },
  },
  {
    slug: "family-bundle",
    title: "Family bundle",
    description:
      "Two pizzas plus two focaccia sandwiches and a Nutella pizza, ready in 30 minutes.",
    conditions: [
      "Available daily after 18:00.",
      "Customizations on the bundle pizzas may incur a small extra charge.",
    ],
    cta: { label: "View Menu", href: "/menu" },
  },
];
