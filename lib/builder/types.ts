export type BlockType =
  | "hero"
  | "featuredProperties"
  | "highlights"
  | "featuredUnits"
  | "reviews"
  | "richText"
  | "imageText"
  | "cta"
  | "faq"
  | "gallery"
  | "mapContact";

export interface Block {
  id: string;
  type: BlockType;
  visible: boolean;
  props: Record<string, unknown>;
}

export interface SiteTheme {
  /** CSS hex colour, e.g. "#2572eb". */
  primary: string;
  /** Corner radius in px. */
  radius: number;
}

export interface SiteLayout {
  version: number;
  page: string;
  theme: SiteTheme;
  blocks: Block[];
}

export type FieldKind = "text" | "textarea" | "number" | "image" | "list";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  /** For kind === "list": the fields of each item. */
  itemFields?: FieldDef[];
  itemLabel?: string;
}

export interface BlockDef {
  type: BlockType;
  label: string;
  description: string;
  defaultProps: Record<string, unknown>;
  fields: FieldDef[];
}

const HERO_DEFAULT = {
  eyebrow: "Club Mykonos · Langebaan · West Coast",
  heading: "Your beachfront escape on the Langebaan lagoon",
  subheading:
    "Self-catering 1, 2 and 3-bedroom apartments with a private beach, two pools and uninterrupted lagoon views — just over an hour from Cape Town.",
  primaryCtaLabel: "Book your stay now",
  primaryCtaHref: "/book",
  secondaryCtaLabel: "View apartments",
  secondaryCtaHref: "/units",
  image: "/images/hero.svg",
};

export const BLOCKS: Record<BlockType, BlockDef> = {
  hero: {
    type: "hero",
    label: "Hero banner",
    description: "Full-width headline image with call-to-action buttons.",
    defaultProps: HERO_DEFAULT,
    fields: [
      { key: "eyebrow", label: "Eyebrow", kind: "text" },
      { key: "heading", label: "Heading", kind: "textarea" },
      { key: "subheading", label: "Subheading", kind: "textarea" },
      { key: "primaryCtaLabel", label: "Primary button label", kind: "text" },
      { key: "primaryCtaHref", label: "Primary button link", kind: "text" },
      { key: "secondaryCtaLabel", label: "Secondary button label", kind: "text" },
      { key: "secondaryCtaHref", label: "Secondary button link", kind: "text" },
      { key: "image", label: "Background image", kind: "image" },
    ],
  },
  featuredProperties: {
    type: "featuredProperties",
    label: "Featured guest houses",
    description: "Pulls your featured properties automatically.",
    defaultProps: {
      heading: "Guest houses we manage",
      subheading: "Hand-picked self-catering stays on the West Coast.",
      limit: 3,
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "subheading", label: "Subheading", kind: "textarea" },
      { key: "limit", label: "How many to show", kind: "number" },
    ],
  },
  highlights: {
    type: "highlights",
    label: "Highlights / benefits",
    description: "A grid of feature cards with an icon, title and text.",
    defaultProps: {
      heading: "Everything you need for the perfect West Coast holiday",
      subheading:
        "Kaliva 185 sits inside the award-winning Club Mykonos resort, minutes from Calypso Beach and the West Coast National Park.",
      items: [
        { icon: "🏖️", title: "Private beach", body: "Step from your apartment straight onto Club Mykonos' private lagoon beach." },
        { icon: "🏊", title: "Two resort pools", body: "Relax by the pools, paddling pools and supertube — all included in your stay." },
        { icon: "🔥", title: "Braai & patio", body: "Every apartment has braai facilities for classic West Coast evenings." },
        { icon: "📶", title: "Free WiFi", body: "Fast fibre WiFi throughout, ideal for remote work or streaming." },
        { icon: "🚗", title: "Free parking", body: "Secure on-site parking at your door — no stress, no fees." },
        { icon: "🏋️", title: "Fitness centre", body: "Keep up your routine at the Club Mykonos gym, moments away." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "subheading", label: "Subheading", kind: "textarea" },
      {
        key: "items",
        label: "Cards",
        kind: "list",
        itemLabel: "Card",
        itemFields: [
          { key: "icon", label: "Icon (emoji)", kind: "text" },
          { key: "title", label: "Title", kind: "text" },
          { key: "body", label: "Text", kind: "textarea" },
        ],
      },
    ],
  },
  featuredUnits: {
    type: "featuredUnits",
    label: "Featured apartments",
    description: "Pulls apartments automatically from the inventory.",
    defaultProps: {
      heading: "Our apartments",
      subheading: "Four apartment types to suit couples, families and groups of friends.",
      limit: 3,
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "subheading", label: "Subheading", kind: "textarea" },
      { key: "limit", label: "How many to show", kind: "number" },
    ],
  },
  reviews: {
    type: "reviews",
    label: "Guest reviews",
    description: "Quotes from guests.",
    defaultProps: {
      heading: "Loved by guests",
      subheading: "Travellers from Cape Town and beyond rate their stay an average of 4.8 out of 5.",
      items: [
        { name: "Michelle & Dave", from: "Cape Town", body: "Spotless apartment, incredible lagoon views and the kids loved the pools." },
        { name: "The Nkosi family", from: "Johannesburg", body: "The 3-bedroom beachfront unit was perfect. Direct beach access made every morning special." },
        { name: "Johan", from: "Stellenbosch", body: "Great value, secure parking and friendly hosts. We'll be back for the angling season." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "subheading", label: "Subheading", kind: "textarea" },
      {
        key: "items",
        label: "Reviews",
        kind: "list",
        itemLabel: "Review",
        itemFields: [
          { key: "name", label: "Guest name", kind: "text" },
          { key: "from", label: "From", kind: "text" },
          { key: "body", label: "Quote", kind: "textarea" },
        ],
      },
    ],
  },
  richText: {
    type: "richText",
    label: "Text block",
    description: "A heading with one or more paragraphs.",
    defaultProps: {
      heading: "About the apartments",
      body: "Each apartment is individually owned and cared for, with braai facilities, a full kitchen and easy access to the resort.",
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
    ],
  },
  imageText: {
    type: "imageText",
    label: "Image + text",
    description: "An image beside a paragraph and optional button.",
    defaultProps: {
      heading: "Wake up to the lagoon",
      body: "Open the doors and let the West Coast in. Every apartment is a short stroll from the water's edge.",
      image: "/images/units/seafront-2br-1.svg",
      imageSide: "left",
      ctaLabel: "See the apartments",
      ctaHref: "/units",
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "image", label: "Image", kind: "image" },
      { key: "imageSide", label: "Image side (left / right)", kind: "text" },
      { key: "ctaLabel", label: "Button label", kind: "text" },
      { key: "ctaHref", label: "Button link", kind: "text" },
    ],
  },
  cta: {
    type: "cta",
    label: "Call to action",
    description: "A coloured band with buttons.",
    defaultProps: {
      heading: "Ready for your West Coast escape?",
      body: "Book direct for our best price and flexible dates. Payment is secure, and there are no hidden fees.",
      primaryLabel: "Book your stay now",
      primaryHref: "/book",
      secondaryLabel: "Explore Langebaan",
      secondaryHref: "/about",
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "body", label: "Body", kind: "textarea" },
      { key: "primaryLabel", label: "Primary button label", kind: "text" },
      { key: "primaryHref", label: "Primary button link", kind: "text" },
      { key: "secondaryLabel", label: "Secondary button label", kind: "text" },
      { key: "secondaryHref", label: "Secondary button link", kind: "text" },
    ],
  },
  faq: {
    type: "faq",
    label: "FAQ",
    description: "Frequently asked questions.",
    defaultProps: {
      heading: "Frequently asked questions",
      items: [
        { q: "What time is check-in and check-out?", a: "Check-in is from 14:00 and check-out is by 10:00." },
        { q: "Is parking free?", a: "Yes — secure on-site parking is included with every apartment." },
        { q: "How do I pay?", a: "South African cards and EFT via PayFast, international cards via Stripe." },
      ],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      {
        key: "items",
        label: "Questions",
        kind: "list",
        itemLabel: "Question",
        itemFields: [
          { key: "q", label: "Question", kind: "text" },
          { key: "a", label: "Answer", kind: "textarea" },
        ],
      },
    ],
  },
  gallery: {
    type: "gallery",
    label: "Gallery",
    description: "A row of images.",
    defaultProps: {
      heading: "Photo gallery",
      images: ["/images/units/beachfront-3br-1.svg", "/images/units/seafront-2br-1.svg", "/images/units/terrace-studio-1.svg"],
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "images", label: "Image paths (comma separated)", kind: "text" },
    ],
  },
  mapContact: {
    type: "mapContact",
    label: "Map & contact",
    description: "Location map with contact details.",
    defaultProps: {
      heading: "Find us",
      address: "Mykonos Access Road, Langebaan, 7357, South Africa",
      showMap: "yes",
    },
    fields: [
      { key: "heading", label: "Heading", kind: "text" },
      { key: "address", label: "Address", kind: "textarea" },
      { key: "showMap", label: "Show map (yes / no)", kind: "text" },
    ],
  },
};

export const BLOCK_ORDER: BlockType[] = [
  "hero",
  "featuredProperties",
  "highlights",
  "featuredUnits",
  "reviews",
  "richText",
  "imageText",
  "cta",
  "faq",
  "gallery",
  "mapContact",
];

/** The site's starting layout — reproduces the original bespoke homepage. */
export function defaultLayout(page = "home"): SiteLayout {
  const make = (type: BlockType, id: string, withProps: Record<string, unknown> = {}): Block => ({
    id,
    type,
    visible: true,
    props: { ...structuredCloneSafe(BLOCKS[type].defaultProps), ...withProps },
  });
  return {
    version: 1,
    page,
    theme: { primary: "#2572eb", radius: 16 },
    blocks:
      page === "home"
        ? [
            make("hero", "blk-hero"),
            make("featuredProperties", "blk-properties"),
            make("highlights", "blk-highlights"),
            make("featuredUnits", "blk-units"),
            make("reviews", "blk-reviews"),
            make("cta", "blk-cta"),
            make("faq", "blk-faq"),
          ]
        : [
            make("hero", "blk-hero", {
              eyebrow: "About & location",
              heading: "Kaliva 185 at Club Mykonos",
              subheading:
                "Greek-inspired self-catering apartments on the edge of the Langebaan Lagoon.",
              primaryCtaLabel: "Book your stay",
              primaryCtaHref: "/book",
              secondaryCtaLabel: "See apartments",
              secondaryCtaHref: "/units",
              image: "/images/hero.svg",
            }),
            make("richText", "blk-about", {
              heading: "The resort & the area",
              body:
                "Set between the lagoon and the West Coast National Park, Club Mykonos has been welcoming guests since the 1990s.\n\nEach apartment is individually owned and cared for, with braai facilities, a full kitchen and easy access to two pools, a private beach, a fitness centre and the resort's restaurants and spa.",
            }),
            make("highlights", "blk-area", {
              heading: "Things to do in Langebaan",
              subheading: "The West Coast has something for everyone — all minutes from your apartment.",
              items: [
                { icon: "🏖️", title: "Calypso Beach", body: "A sheltered, family-friendly beach a short walk from the resort — perfect for swimming and sunsets." },
                { icon: "🌼", title: "West Coast National Park", body: "Famous for spring wildflowers at Postberg and the turquoise lagoon. Twenty minutes away." },
                { icon: "🎣", title: "Fishing & boating", body: "Langebaan is a fishing and kite-surfing mecca. Launch a boat or join a charter from the lagoon." },
                { icon: "🚴", title: "Cycling & hiking", body: "Flat coastal routes and the Strandveld trails suit all ages and fitness levels." },
                { icon: "🍽️", title: "Dining & markets", body: "Restaurants, a spa and the Saturday West Coast market are all within the resort or nearby." },
                { icon: "🚗", title: "Cape Town day trips", body: "Just over an hour from the city — an easy weekend escape from Cape Town." },
              ],
            }),
            make("mapContact", "blk-map"),
            make("cta", "blk-cta"),
          ],
  };
}

function structuredCloneSafe<T>(v: T): T {
  if (typeof structuredClone === "function") return structuredClone(v);
  return JSON.parse(JSON.stringify(v));
}
