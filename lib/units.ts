export type ViewType = "sea" | "beach" | "terrace" | "resort";

export interface Unit {
  slug: string;
  /** Which guest house this room belongs to (Property.slug). */
  propertySlug: string;
  name: string;
  tagline: string;
  description: string;
  bedrooms: number;          // 0 = open-plan studio
  sleeps: number;
  bathrooms: number;
  sizeSqm: number;
  view: ViewType;
  basePriceCents: number;    // low-season rate per night, in ZAR cents
  amenities: string[];
  images: string[];          // local /public paths
  featured?: boolean;
}

/**
 * Room inventory. Each room belongs to a Property (guest house). Kept as typed
 * static config so listings render instantly and stay static/SEO friendly.
 * Mirrored in prisma/schema.prisma so it can move into Postgres and be seeded.
 */
export const UNITS: Unit[] = [
  // ── Kaliva 185 Langebaan ──
  {
    slug: "terrace-studio", propertySlug: "kaliva-185-langebaan",
    name: "Terrace Studio", tagline: "Cosy couple's retreat with a private terrace",
    description: "An open-plan studio opening onto a sun-drenched private terrace. Ideal for couples seeking a quiet West Coast escape.",
    bedrooms: 0, sleeps: 2, bathrooms: 1, sizeSqm: 34, view: "terrace", basePriceCents: 95000,
    amenities: ["kitchenette", "aircon", "wifi", "terrace", "dstv", "pool access"],
    images: ["/images/units/terrace-studio-1.svg", "/images/units/terrace-studio-2.svg"],
    featured: false,
  },
  {
    slug: "seafront-1br", propertySlug: "kaliva-185-langebaan",
    name: "Seafront One-Bedroom", tagline: "Wake up to the lagoon",
    description: "A bright one-bedroom apartment with a full kitchen and a balcony facing the Langebaan lagoon.",
    bedrooms: 1, sleeps: 3, bathrooms: 1, sizeSqm: 52, view: "sea", basePriceCents: 145000,
    amenities: ["full kitchen", "sea view", "aircon", "wifi", "braai", "pool access", "parking"],
    images: ["/images/units/seafront-1br-1.svg", "/images/units/seafront-1br-2.svg"],
    featured: true,
  },
  {
    slug: "seafront-2br", propertySlug: "kaliva-185-langebaan",
    name: "Seafront Two-Bedroom", tagline: "Space for the whole family",
    description: "Two comfortable bedrooms, two bathrooms and an open-plan living area with lagoon views.",
    bedrooms: 2, sleeps: 5, bathrooms: 2, sizeSqm: 78, view: "sea", basePriceCents: 210000,
    amenities: ["full kitchen", "sea view", "aircon", "wifi", "braai", "pool access", "parking", "fitness centre"],
    images: ["/images/units/seafront-2br-1.svg", "/images/units/seafront-2br-2.svg"],
    featured: true,
  },
  {
    slug: "beachfront-3br", propertySlug: "kaliva-185-langebaan",
    name: "Beachfront Three-Bedroom", tagline: "The flagship — beach on your doorstep",
    description: "Our largest apartment, right on the sand: three bedrooms, two bathrooms and a generous living space.",
    bedrooms: 3, sleeps: 6, bathrooms: 2, sizeSqm: 104, view: "beach", basePriceCents: 295000,
    amenities: ["full kitchen", "beachfront", "aircon", "wifi", "braai", "pool access", "parking", "fitness centre", "dishwasher"],
    images: ["/images/units/beachfront-3br-1.svg", "/images/units/beachfront-3br-2.svg"],
    featured: true,
  },
  // ── Lagoon View Cottage ──
  {
    slug: "lagoon-cottage-2br", propertySlug: "lagoon-view-cottage",
    name: "Cottage Two-Bedroom", tagline: "Sunny patio and braai",
    description: "Both bedrooms open onto a covered patio with a braai, a few minutes from the lagoon.",
    bedrooms: 2, sleeps: 4, bathrooms: 1, sizeSqm: 64, view: "resort", basePriceCents: 125000,
    amenities: ["full kitchen", "braai", "wifi", "parking", "pet friendly"],
    images: ["/images/units/terrace-studio-1.svg", "/images/units/seafront-1br-1.svg"],
    featured: true,
  },
  {
    slug: "lagoon-cottage-studio", propertySlug: "lagoon-view-cottage",
    name: "Cottage Studio", tagline: "Compact and comfy",
    description: "A neat open-plan studio for two, with a kitchenette and a small private courtyard.",
    bedrooms: 0, sleeps: 2, bathrooms: 1, sizeSqm: 30, view: "resort", basePriceCents: 80000,
    amenities: ["kitchenette", "wifi", "parking"],
    images: ["/images/units/terrace-studio-2.svg"],
    featured: false,
  },
  // ── West Coast Villa ──
  {
    slug: "villa-4br", propertySlug: "west-coast-villa",
    name: "Villa (4 bedroom)", tagline: "Private pool and sea views",
    description: "A large four-bedroom villa with a private pool, big entertainment area and sea views. Sleeps up to ten.",
    bedrooms: 4, sleeps: 10, bathrooms: 3, sizeSqm: 210, view: "beach", basePriceCents: 420000,
    amenities: ["full kitchen", "sea view", "aircon", "wifi", "braai", "pool access", "parking", "dishwasher"],
    images: ["/images/units/beachfront-3br-2.svg"],
    featured: false,
  },
];

export const AMENITY_LABELS: Record<string, string> = {
  kitchenette: "Kitchenette",
  "full kitchen": "Full kitchen",
  dishwasher: "Dishwasher",
  aircon: "Air-conditioning",
  wifi: "Free WiFi",
  dstv: "DSTV",
  terrace: "Private terrace",
  "sea view": "Sea view",
  beachfront: "Beachfront",
  braai: "Braai / BBQ",
  "pool access": "Pool access",
  parking: "Free parking",
  "fitness centre": "Fitness centre",
  "pet friendly": "Pet friendly",
};

export const VIEW_LABELS: Record<ViewType, string> = {
  sea: "Sea / lagoon view",
  beach: "Beachfront",
  terrace: "Terrace",
  resort: "Resort view",
};

export function getUnit(slug: string): Unit | undefined {
  return UNITS.find((u) => u.slug === slug);
}

export function unitsForProperty(propertySlug: string): Unit[] {
  return UNITS.filter((u) => u.propertySlug === propertySlug);
}

export function priceRange() {
  const prices = UNITS.map((u) => u.basePriceCents);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
