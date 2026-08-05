export interface Deal {
  slug: string;
  title: string;
  description: string;
  conditions: string[];
  cta: { label: string; href: string };
}

/** A headline promotion with its own artwork (the Grand Opening flyer), shown as
 *  a featured banner on the Deals page above the standing offers. */
export interface FeaturedDeal {
  slug: string;
  eyebrow: string;
  title: string;
  intro: string;
  points: string[];
  validity: string;
  image: { src: string; alt: string };
  cta: { label: string; href: string };
}

/**
 * Grand Opening – 50% OFF. A separate promotion from the Free Pizza welcome offer
 * below (which is left untouched). The discount is automatic and codeless: it is
 * enforced at checkout by the menu_discount config (see src/lib/menu-discount),
 * not by anything on this page — this card is the storefront announcement of it.
 */
export const GRAND_OPENING_DEAL: FeaturedDeal = {
  slug: "grand-opening-50-off",
  eyebrow: "Grand Opening",
  title: "50% off the entire menu",
  intro:
    "We're open in Ajman — and every item on the menu is half price to celebrate. No coupon, no code, nothing to claim: the 50% comes off automatically at checkout, whether you have an account or not.",
  points: [
    "50% off all menu items — applied automatically",
    "No voucher or coupon code required",
    "Signed in or ordering as a guest, for pickup or delivery",
    "Delivery and service fees are charged as normal (not discounted)",
  ],
  validity: "Valid 28 July – 28 August 2026",
  image: {
    src: "/images/grand-opening.webp",
    alt: "Napoli 7 Grand Opening — 50% off the entire menu, 28 July to 28 August",
  },
  cta: { label: "Order now", href: "/menu" },
};

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
