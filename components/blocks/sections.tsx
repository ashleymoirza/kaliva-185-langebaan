import Image from "next/image";
import { UNITS } from "@/lib/units";
import { SITE, mapsEmbedSrc, whatsappLink } from "@/lib/site";
import { LinkButton } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import UnitCard from "@/components/UnitCard";
import PropertyCard from "@/components/PropertyCard";
import Badge from "@/components/ui/Badge";
import type { Property } from "@/lib/properties";

type Props = Record<string, unknown>;

const s = (p: Props, k: string, d = ""): string => (typeof p[k] === "string" ? (p[k] as string) : d);
const n = (p: Props, k: string, d: number): number => {
  const v = Number(p[k]);
  return Number.isFinite(v) ? v : d;
};
function rows(p: Props, k: string): Props[] {
  const v = p[k];
  return Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as Props[]) : [];
}

export function HeroBlock({ props }: { props: Props }) {
  const heading = s(props, "heading", `${SITE.name} — Beachfront apartments at ${SITE.resort}`);
  const subheading = s(props, "subheading", "Wake up to the Langebaan lagoon. Privately owned 6-sleeper flagship with 3 bedrooms, private braai, and direct beach access. Book direct for the best price.");
  const eyebrow = s(props, "eyebrow", "Club Mykonos · Langebaan · West Coast");
  const primaryCtaLabel = s(props, "primaryCtaLabel", "Book your stay");
  const secondaryCtaLabel = s(props, "secondaryCtaLabel", "View all apartments");

  return (
    <section className="relative isolate flex min-h-[90svh] max-h-[900px] items-center overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src={s(props, "image", "/images/hero.svg") || "/images/hero.svg"}
          alt={heading}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/80 via-brand-900/50 to-brand-900/80" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-brand-900/30 via-transparent to-transparent" />
      </div>
      <Container className="py-24 text-white relative z-10">
        {eyebrow && (
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-1.5 text-sm font-medium ring-1 ring-white/20 backdrop-blur">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {eyebrow}
          </p>
        )}
        <h1 className="max-w-4xl text-5xl font-extrabold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
          {heading}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-white/90 leading-relaxed">{subheading}</p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <LinkButton href="/book" size="xl" variant="accent" className="shadow-elevated hover:shadow-elevated">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            {primaryCtaLabel}
          </LinkButton>
          <LinkButton href="/units" size="xl" variant="secondary" className="bg-white/95 text-brand-800 ring-white/30 hover:bg-white hover:shadow-card-hover">
            {secondaryCtaLabel}
          </LinkButton>
        </div>
        <div className="mt-16 flex flex-wrap items-center gap-8 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span>Check-in 14:00 · Check-out 10:00</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Secure PayFast, Stripe & Ozow</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
            <span>Best-price guarantee</span>
          </div>
        </div>
      </Container>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/50"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
      </div>
    </section>
  );
}

export function HighlightsBlock({ props }: { props: Props }) {
  const items = rows(props, "items");
  const defaultItems = [
    { icon: "🏖️", title: "Private Beach", body: "Direct access to Calypso Beach — safe swimming in the sheltered lagoon." },
    { icon: "🏊", title: "Two Resort Pools", body: "Adults-only infinity pool and family pool with children's area." },
    { icon: "🍽️", title: "Full Self-Catering", body: "Modern kitchens with dishwasher, oven, fridge-freezer and braai facilities." },
    { icon: "🚗", title: "Free Secure Parking", body: "Dedicated undercover parking for each apartment." },
    { icon: "🏋️", title: "Fitness Centre", body: "Fully equipped gym on-site, included in your stay." },
    { icon: "📶", title: "High-Speed WiFi", body: "Fibre internet throughout — work or stream seamlessly." },
  ];
  const displayItems = items.length ? items : defaultItems;

  return (
    <section className="py-20 bg-sand-50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Why stay at Kaliva 185?")}</h2>
          <p className="mt-4 text-lg text-slate-600">{s(props, "subheading", "Everything you need for a perfect West Coast getaway — all included.")}</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayItems.map((it, i) => (
            <div key={i} className="group h-full rounded-2xl bg-white p-7 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
              <div className="text-4xl mb-4" aria-hidden="true">{s(it, "icon")}</div>
              <h3 className="font-semibold text-slate-900 text-lg">{s(it, "title")}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s(it, "body")}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function FeaturedUnitsBlock({ props }: { props: Props }) {
  const limit = Math.max(1, Math.min(UNITS.length, n(props, "limit", 3)));
  const featured = UNITS.filter((u) => u.featured && u.propertySlug === "kaliva-185-langebaan").slice(0, limit);
  const list = featured.length ? featured : UNITS.filter((u) => u.propertySlug === "kaliva-185-langebaan").slice(0, limit);

  return (
    <section className="py-20">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <Badge variant="brand" className="mb-3">Kaliva 185 Langebaan</Badge>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Our beachfront apartments")}</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{s(props, "subheading", "Four unique apartments in our privately owned flagship property. The 3-bedroom beachfront flagship sleeps 6 with a private braai — rooms not rented separately.")}</p>
          </div>
          <LinkButton href="/units" size="lg" variant="secondary">All apartments</LinkButton>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((u) => (
            <UnitCard key={u.slug} unit={u} />
          ))}
        </div>
      </Container>
    </section>
  );
}

export function ReviewsBlock({ props }: { props: Props }) {
  const items = rows(props, "items");
  const defaultReviews = [
    { name: "Sarah M.", from: "Cape Town", body: "Absolutely stunning! The beachfront 3-bedroom is perfect for our family of 5. Waking up to the lagoon view and having our own private braai made the stay unforgettable. The resort pools are fantastic too." },
    { name: "James & Priya", from: "Durban", body: "Best value on the West Coast. Direct booking saved us thousands vs the platforms. The seafront 2-bedroom had everything we needed — full kitchen, aircon, fast WiFi. Will definitely return." },
    { name: "The Van der Merwe Family", from: "Pretoria", body: "Club Mykonos is our annual tradition and Kaliva 185 is by far our favourite. The kids love the pools and beach, we love the braai and sunset views. Already booked for next December!" },
  ];
  const displayItems = items.length ? items : defaultReviews;

  return (
    <section className="py-20 bg-sand-50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="success" className="mb-3">4.9/5 · 127 reviews</Badge>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "What our guests say")}</h2>
          <p className="mt-4 text-lg text-slate-600">{s(props, "subheading", "Real stays, real stories from families who've made memories at Kaliva 185.")}</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {displayItems.map((r, i) => (
            <figure key={i} className="h-full rounded-2xl bg-white p-7 shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
              <div className="flex items-center gap-1 text-amber-500" aria-label="5 out of 5 stars">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <blockquote className="mt-4 text-sm text-slate-700 leading-relaxed">&ldquo;{s(r, "body")}&rdquo;</blockquote>
              <figcaption className="mt-5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
                  {s(r, "name")?.charAt(0) ?? "G"}
                </div>
                <div>
                  <div>{s(r, "name")}</div>
                  {s(r, "from") && <div className="text-xs font-normal text-slate-500">{s(r, "from")}</div>}
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function RichTextBlock({ props }: { props: Props }) {
  return (
    <section className="py-20">
      <Container size="md">
        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 text-center">{s(props, "heading")}</h2>
        <div className="mt-8 max-w-3xl mx-auto prose prose-slate max-w-none">
          {(s(props, "body") || "").split(/\n\n+/).map((para, i) => (
            <p key={i} className="text-lg leading-relaxed text-slate-600">{para}</p>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function ImageTextBlock({ props }: { props: Props }) {
  const left = s(props, "imageSide", "left") !== "right";
  const heading = s(props, "heading");
  const body = s(props, "body");
  const ctaLabel = s(props, "ctaLabel");
  const ctaHref = s(props, "ctaHref", "/units");
  const image = s(props, "image");

  return (
    <section className="py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-100 shadow-card ${left ? "" : "lg:order-2"}`}>
            {image && (
              <Image src={image} alt={heading} fill sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
            )}
          </div>
          <div className={left ? "" : "lg:order-1"}>
            {heading && <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{heading}</h2>}
            {body && <p className="mt-5 text-lg leading-relaxed text-slate-600">{body}</p>}
            {ctaLabel && (
              <div className="mt-8">
                <LinkButton href={ctaHref} size="lg" variant="primary">{ctaLabel}</LinkButton>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function CtaBlock({ props }: { props: Props }) {
  return (
    <section className="py-20">
      <Container>
        <div className="rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-900 px-8 py-16 sm:py-20 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-600/30 via-transparent to-transparent" />
          <div className="relative">
            <Badge variant="accent" className="mb-4 bg-white/15 border-white/30 text-white">
              Book direct & save
            </Badge>
            <h2 className="text-4xl font-extrabold sm:text-5xl">{s(props, "heading", "Ready for your West Coast escape?")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/85 text-lg">{s(props, "body", "Check live availability and secure your dates in minutes. Best price guaranteed — no hidden fees, no platform markups.")}</p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              {s(props, "primaryLabel") && (
                <LinkButton href={s(props, "primaryHref", "/book")} size="xl" variant="secondary" className="bg-white px-9 py-4 text-base shadow-elevated hover:shadow-elevated">
                  {s(props, "primaryLabel")}
                </LinkButton>
              )}
              {s(props, "secondaryLabel") && (
                <LinkButton href={s(props, "secondaryHref", "/about")} size="xl" variant="ghost" className="px-9 py-4 text-base text-white hover:bg-white/10">
                  {s(props, "secondaryLabel")}
                </LinkButton>
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FaqBlock({ props }: { props: Props }) {
  const items = rows(props, "items");
  const defaultFaqs = [
    { q: "What's the minimum stay?", a: "2 nights year-round, 3 nights during peak season (Dec–Jan, Easter, long weekends)." },
    { q: "Is the private braai only in the 3-bedroom?", a: "Yes, the beachfront 3-bedroom flagship has its own built-in braai on the patio. The other apartments share the resort's communal braai areas." },
    { q: "Are rooms rented separately in the 3-bedroom?", a: "No — the beachfront 3-bedroom (6 sleeper) is rented as a whole unit only. It's perfect for families or groups wanting exclusive use." },
    { q: "What's included in the rate?", a: "Accommodation, all utilities, WiFi, parking, resort pool/fitness access, linen & towels. Cleaning on departure included. No hidden fees." },
    { q: "Can I bring my pet?", a: "Kaliva 185 apartments are not pet-friendly. Our Lagoon View Cottage property (separate listing) does welcome pets." },
    { q: "How do I pay?", a: "Secure online payment via PayFast (SA cards/EFT), Stripe (international cards), or Ozow (instant EFT). Or choose 'Pay later' to send an enquiry." },
  ];
  const displayItems = items.length ? items : defaultFaqs;

  return (
    <section className="py-20 bg-sand-50">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Frequently asked questions")}</h2>
          <p className="mt-4 text-lg text-slate-600">{s(props, "subheading", "Quick answers to common questions. Can't find what you need? WhatsApp us anytime.")}</p>
        </div>
        <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {displayItems.map((f, i) => (
            <div key={i} className="rounded-2xl bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow duration-300">
              <dt className="font-semibold text-slate-900 leading-tight">{s(f, "q")}</dt>
              <dd className="mt-3 text-sm text-slate-600 leading-relaxed">{s(f, "a")}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}

export function GalleryBlock({ props }: { props: Props }) {
  const raw = s(props, "images");
  const images = raw.split(",").map((x) => x.trim()).filter(Boolean);
  const defaultImages = [
    "/images/units/beachfront-3br-1.svg",
    "/images/units/seafront-2br-1.svg",
    "/images/units/seafront-1br-1.svg",
    "/images/units/terrace-studio-1.svg",
    "/images/hero.svg",
  ];
  const displayImages = images.length ? images : defaultImages;

  return (
    <section className="py-20">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Photo gallery")}</h2>
          <p className="mt-3 max-w-2xl text-slate-600">{s(props, "subheading", "Explore the apartments, resort amenities and the stunning Langebaan lagoon setting.")}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayImages.map((src, i) => (
            <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand-100 shadow-card hover:shadow-card-hover transition-shadow duration-300">
              <Image src={src} alt="" fill sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function MapContactBlock({ props }: { props: Props }) {
  const showMap = s(props, "showMap", "yes").toLowerCase() !== "no";

  return (
    <section className="py-20">
      <Container>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Find us & get in touch")}</h2>
          <p className="mt-3 max-w-2xl text-slate-600">{s(props, "subheading", "Kaliva 185 is inside Club Mykonos resort, right on the Langebaan lagoon. We'd love to hear from you.")}</p>
        </div>
        <div className="grid gap-10 lg:grid-cols-2">
          {showMap && (
            <div className="overflow-hidden rounded-2xl border border-brand-100 shadow-card">
              <iframe title="Kaliva 185 Langebaan location map" src={mapsEmbedSrc()} className="h-[500px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          )}
          <div className="rounded-2xl bg-white p-7 sm:p-8 shadow-card">
            <ul className="space-y-5 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                <div>
                  <p className="font-medium text-slate-900">Address</p>
                  <p className="mt-1">{s(props, "address", SITE.address)}</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg></span>
                <div>
                  <p className="font-medium text-slate-900">Email</p>
                  <a href={`mailto:${SITE.email}`} className="mt-1 hover:text-brand-700 transition-colors">{SITE.email}</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></span>
                <div>
                  <p className="font-medium text-slate-900">Phone / WhatsApp</p>
                  <a href={`tel:${SITE.phoneDisplay.replace(/\s/g, "")}`} className="mt-1 hover:text-brand-700 transition-colors">{SITE.phoneDisplay}</a>
                </div>
              </li>
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href={whatsappLink("Hi, I'd like to enquire about a stay at Kaliva 185.")} size="lg" variant="whatsapp" className="w-full sm:w-auto">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.914 11.914 0 0012 0C5.373 0 0 5.373 0 12c0 1.997.53 3.886 1.488 5.557L0 24l6.133-1.825A11.957 11.957 0 0012 24c6.627 0 12-5.373 12-12 0-1.834-.364-3.57-1.011-5.155L20.52 3.48zM8 13c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v4z"/></svg>
                WhatsApp us
              </LinkButton>
              <LinkButton href="/book" size="lg" variant="primary" className="w-full sm:w-auto">Book your stay</LinkButton>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

export function FeaturedPropertiesBlock({ props, properties }: { props: Props; properties: Property[] }) {
  const limit = Math.max(1, Math.min(properties.length || 1, n(props, "limit", 3)));
  const featured = properties.filter((p) => p.featured).slice(0, limit);
  const list = featured.length ? featured : properties.slice(0, limit);

  return (
    <section className="py-20 bg-sand-50">
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">{s(props, "heading", "Other properties we manage")}</h2>
            <p className="mt-3 max-w-2xl text-slate-600">{s(props, "subheading", "Hand-picked guest houses on the West Coast, each with its own character and charm.")}</p>
          </div>
          <LinkButton href="/properties" size="lg" variant="secondary">All guest houses</LinkButton>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => <PropertyCard key={p.slug} property={p} />)}
        </div>
      </Container>
    </section>
  );
}