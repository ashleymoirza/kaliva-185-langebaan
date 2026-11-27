export const SITE = {
  name: "Kaliva 185 Langebaan",
  shortName: "Kaliva 185",
  resort: "Club Mykonos",
  tagline: "Self-catering beachfront apartments on the Langebaan lagoon",
  address: "Mykonos Access Road, Langebaan, 7357, South Africa",
  phoneDisplay: "+27 82 123 4567",
  /** Digits only, international format (no +) for wa.me links. */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "27821234567",
  email: process.env.CONTACT_EMAIL ?? "stay@kaliva185.duckdns.org",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kaliva185.duckdns.org",
  coords: { lat: -33.0498, lng: 18.0333 },
} as const;

export function whatsappLink(message: string, number: string = SITE.whatsapp): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function mapsEmbedSrc(): string {
  const { lat, lng } = SITE.coords;
  // Plain embed without an API key (works for a single marker).
  return `https://www.google.com/maps?q=${lat},${lng}&hl=en&z=14&output=embed`;
}

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/properties", label: "Guest houses" },
  { href: "/units", label: "All rooms" },
  { href: "/book", label: "Book" },
  { href: "/about", label: "About & Location" },
] as const;
