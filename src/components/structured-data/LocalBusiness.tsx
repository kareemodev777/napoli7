const localBusinessData = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": "https://napoli7.com/#restaurant",
  name: "Napoli 7",
  description:
    "Authentic Neapolitan pizza in Ajman. Caputo flour, San Marzano DOP, lievito madre, hand-stretched, wood-fired.",
  url: "https://napoli7.com",
  image: "https://napoli7.com/images/hero-neapolitan-uae.jpg",
  telephone: "+97165345772",
  servesCuisine: ["Italian", "Neapolitan"],
  priceRange: "AED 15-69",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Shop 4, 213 Sheikh Rashid bin Abdul Aziz St",
    addressLocality: "Al Jurf 2, Ajman",
    addressCountry: "AE",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 25.4002327,
    longitude: 55.5033167,
  },
  openingHours: "Mo-Su 11:00-22:00",
  sameAs: ["https://wa.me/971501628577"],
};

const serializedJson = JSON.stringify(localBusinessData);

export function LocalBusinessJsonLd() {
  return (
    <script type="application/ld+json" suppressHydrationWarning>
      {serializedJson}
    </script>
  );
}
