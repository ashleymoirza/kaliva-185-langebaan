export interface Property {
  slug: string;
  name: string;
  tagline: string;
  /** Where it is, e.g. "Club Mykonos, Langebaan". */
  location: string;
  description: string;
  images: string[];
  amenities: string[];
  featured: boolean;
  active: boolean;
}

export const AMENITY_LABELS_PROPERTY: Record<string, string> = {
  "private beach": "Private beach",
  "pool": "Pool",
  braai: "Braai / BBQ",
  wifi: "Free WiFi",
  parking: "Free parking",
  "fitness centre": "Fitness centre",
  "sea view": "Sea view",
  "pet friendly": "Pet friendly",
  "self catering": "Self-catering",
  "aircon": "Air-conditioning",
  "kids play area": "Kids play area",
};

/**
 * The portfolio of guest houses marketed on this site. Kaliva 185 is the
 * flagship; the others are further listings you manage. Editable from
 * /admin/properties (persisted in Postgres or the demo file store).
 */
export const PROPERTIES: Property[] = [
  {
    slug: "kaliva-185-langebaan",
    name: "Kaliva 185 Langebaan",
    tagline: "Beachfront apartments on the Langebaan lagoon",
    location: "Club Mykonos, Langebaan",
    description:
      "Our flagship collection of self-catering apartments inside the Greek-inspired Club Mykonos resort, with a private beach, two pools and wide lagoon views.",
    images: ["/images/units/beachfront-3br-1.svg", "/images/units/seafront-2br-1.svg", "/images/hero.svg"],
    amenities: ["private beach", "pool", "braai", "wifi", "parking", "fitness centre", "sea view", "self catering"],
    featured: true,
    active: true,
  },
  {
    slug: "lagoon-view-cottage",
    name: "Lagoon View Cottage",
    tagline: "A quiet cottage a stroll from the water",
    location: "Langebaan West",
    description:
      "A relaxed two-bedroom cottage a few minutes from the lagoon, with a sunny patio and braai. Ideal for a small family or two couples.",
    images: ["/images/units/terrace-studio-1.svg", "/images/units/seafront-1br-1.svg"],
    amenities: ["braai", "wifi", "parking", "self catering", "pet friendly"],
    featured: true,
    active: true,
  },
  {
    slug: "west-coast-villa",
    name: "West Coast Villa",
    tagline: "A spacious villa for the whole group",
    location: "Langebaan Beach",
    description:
      "A large four-bedroom villa moments from the beach, with a private pool, big entertainment area and sea views. Sleeps up to ten.",
    images: ["/images/units/beachfront-3br-2.svg"],
    amenities: ["pool", "braai", "wifi", "parking", "sea view", "aircon", "self catering"],
    featured: false,
    active: true,
  },
];

export function getProperty(slug: string): Property | undefined {
  return PROPERTIES.find((p) => p.slug === slug);
}
