import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Sans, Source_Sans_3, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WhatsAppButton from "@/components/WhatsAppButton";
import MetaPixel from "@/components/MetaPixel";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-source-sans-3",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Beachfront apartments at ${SITE.resort}`,
    template: `%s · ${SITE.shortName}`,
  },
  description:
    "Book self-catering 1, 2 and 3-bedroom beachfront apartments at Kaliva 185, Club Mykonos, Langebaan. Private beach, pools, free WiFi and parking.",
  keywords: [
    "Kaliva 185",
    "Club Mykonos accommodation",
    "Langebaan self catering",
    "West Coast holiday apartments",
    "Langebaan beachfront",
  ],
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — Beachfront apartments at ${SITE.resort}`,
    description: "Self-catering apartments on the Langebaan lagoon, Club Mykonos.",
    images: [{ url: "/images/hero.svg", width: 1600, height: 900, alt: SITE.name }],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#2572eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-ZA" className={`${dmSans.variable} ${sourceSans3.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white font-airbnb">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
        <MetaPixel />
      </body>
    </html>
  );
}