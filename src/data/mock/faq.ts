export interface FaqItem {
  q: string;
  a: string;
  link?: { label: string; href: string };
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    q: "What makes Napoli 7 pizza special?",
    a: "We use Caputo flour, San Marzano DOP tomatoes, and our own lievito madre. Each base is hand-stretched (the schiaffo napoletano), then baked at 450°C in a wood-fired oven for ninety seconds. The result is the soft cornicione, the leoparded crust, and the moisture you only get from a real Neapolitan pizza.",
  },
  {
    q: "Do you offer takeaway and delivery?",
    a: "Yes — both. Pickup is ready in around fifteen minutes from order. Delivery covers Al Jurf and surrounding neighbourhoods of Ajman and arrives in around thirty minutes.",
  },
  {
    q: "Where exactly are you located?",
    a: "Shop 4, opposite Delta Supermarket, 213 Sheikh Rashid bin Abdul Aziz Street, Al Jurf 2, Ajman.",
    link: {
      label: "View on Google Maps",
      href: "https://www.google.com/maps/place/Napoli+7/@25.4004197,55.5007712,17z/data=!3m1!4b1!4m6!3m5!1s0x3ef5f7a61a747c87:0x17e02677cff3236e!8m2!3d25.4004197!4d55.5033461!16s%2Fg%2F11myjz846f",
    },
  },
  {
    q: "What are your opening hours?",
    a: "We are open Tuesday to Sunday from 12:30 to 00:00. We are closed on Mondays.",
  },
  {
    q: "How can I pay?",
    a: "Card payments are available at checkout, including Apple Pay and Google Pay. Cash on delivery is available for pickup orders only.",
  },
  {
    q: "Can I customize my pizza?",
    a: "Some of our pizzas, such as the Margherita Classic, allow per-ingredient customization — extra mozzarella, no basil, and so on. Open a product page to see the available options.",
  },
  {
    q: "Do you cater for events?",
    a: "We do not currently run a catering service for large events, but we are happy to take large orders with at least three hours of notice. Call us on +971 6 534 5772 to arrange.",
  },
];
