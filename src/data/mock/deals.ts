export interface Deal {
  slug: string;
  title: string;
  description: string;
  conditions: string[];
  cta: { label: string; href: string };
}

export interface WelcomeOffer {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  pickup: { heading: string; item: string };
  delivery: {
    heading: string;
    intro: string;
    upgrades: string[];
    note: string;
  };
  orderTogether: {
    heading: string;
    intro: string;
    points: string[];
  };
  limited: { heading: string; text: string };
  cta: { label: string; href: string };
}

export const WELCOME_OFFER: WelcomeOffer = {
  slug: "first-pizza-on-us",
  eyebrow: "Welcome offer",
  title: "Your first small Margherita is on us",
  intro: "Create your Napoli 7 account and receive a 19 AED promo code.",
  pickup: {
    heading: "Pickup",
    item: "Free Small Margherita",
  },
  delivery: {
    heading: "Delivery",
    intro: "Delivery is available with any food upgrade:",
    upgrades: [
      "Upgrade your free Small Margherita to a Medium",
      "Any other pizza",
      "Focaccia",
      "Dessert",
    ],
    note: "Drinks do not qualify.",
  },
  orderTogether: {
    heading: "Order together",
    intro: "Use multiple promo codes in one order.",
    points: [
      "One food upgrade unlocks delivery for the whole order",
      "Only one delivery fee and one service fee per order",
    ],
  },
  limited: {
    heading: "Limited offer",
    text: "Only the first 1,000 customers receive a promo code.",
  },
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
