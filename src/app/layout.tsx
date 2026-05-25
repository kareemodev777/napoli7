import type { Metadata } from "next";
import { Inter, Inter_Tight } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-display-runtime",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://napoli7.com",
  ),
  title: {
    default: "Napoli 7 — Authentic Italian Neapolitan Pizza, Ajman",
    template: "%s · Napoli 7",
  },
  description:
    "Authentic Neapolitan pizza in Ajman. Caputo flour, San Marzano DOP, lievito madre. Hand-stretched, wood-fired, delivered hot in 30 minutes.",
  openGraph: {
    title: "Napoli 7 — Authentic Italian Neapolitan Pizza, Ajman",
    description:
      "Caputo flour, San Marzano DOP, lievito madre. Hand-stretched, wood-fired, delivered in 30 minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${interTight.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-brand focus:text-primary-foreground focus:px-4 focus:py-2 focus:font-display focus:text-sm focus:tracking-[0.15em] focus:uppercase"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
