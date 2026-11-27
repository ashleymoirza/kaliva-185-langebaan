import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getUnit, UNITS, AMENITY_LABELS, VIEW_LABELS } from "@/lib/units";
import { formatZAR } from "@/lib/utils";
import Gallery from "@/components/Gallery";
import Badge from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import UnitCard from "@/components/UnitCard";

export function generateStaticParams() {
  return UNITS.map((u) => ({ id: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const unit = getUnit(id);
  if (!unit) return { title: "Apartment not found" };
  return {
    title: unit.name,
    description: `${unit.tagline}. ${unit.name} at Kaliva 185, Club Mykonos — sleeps ${unit.sleeps}, from ${formatZAR(unit.basePriceCents)} per night.`,
    alternates: { canonical: `/units/${unit.slug}` },
    openGraph: {
      images: [{ url: unit.images[0] }],
      type: "website",
    },
  };
}

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const unit = getUnit(id);
  if (!unit) notFound();

  const others = UNITS.filter((u) => u.slug !== unit.slug && u.propertySlug === unit.propertySlug).slice(0, 3);
  const isFlagship = unit.slug === "beachfront-3br";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Accommodation",
    name: unit.name,
    description: unit.description,
    occupancy: { "@type": "QuantitativeValue", maxValue: unit.sleeps },
    floorSize: { "@type": "QuantitativeValue", value: unit.sizeSqm, unitCode: "MTK" },
    amenityFeature: unit.amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: AMENITY_LABELS[a] ?? a,
      value: true,
    })),
    image: unit.images,
    offers: {
      "@type": "Offer",
      price: unit.basePriceCents / 100,
      priceCurrency: "ZAR",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <Container size="xl" className="py-10">
      <nav className="mb-8 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700 transition-colors flex items-center gap-1">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/units" className="hover:text-brand-700 transition-colors flex items-center gap-1">Apartments</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700 font-medium">{unit.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Gallery images={unit.images} alt={unit.name} />
          <div className="mt-10">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <Badge variant="brand">{VIEW_LABELS[unit.view]}</Badge>
              <Badge variant={isFlagship ? "accent" : "default"}>Sleeps {unit.sleeps}</Badge>
              <Badge>{unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms} bedroom`}</Badge>
              <Badge>{unit.bathrooms} bathroom</Badge>
              <Badge>{unit.sizeSqm} m²</Badge>
              {isFlagship && <Badge variant="accent">Flagship · Private Braai</Badge>}
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">{unit.name}</h1>
            <p className="text-lg text-slate-600 mb-6">{unit.tagline}</p>
            <p className="text-lg leading-relaxed text-slate-700 mb-8">{unit.description}</p>

            <div className="rounded-2xl bg-sand-50 p-6 mb-10">
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-500"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 2 12.79z"/></svg>
                What&apos;s included
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {unit.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2.5 text-sm text-slate-700 p-2.5 rounded-xl hover:bg-white transition-colors">
                    <span className="text-brand-600 shrink-0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg></span>
                    {AMENITY_LABELS[a] ?? a}
                  </li>
                ))}
              </ul>
            </div>

            {others.length > 0 && (
              <section className="mt-10">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Other apartments you may like</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {others.map((u) => (
                    <UnitCard key={u.slug} unit={u} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-sand-200 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow-card">
            <div className="mb-5">
              <p className="text-sm text-slate-500">From</p>
              <p className="text-3xl font-extrabold text-slate-900">
                {formatZAR(unit.basePriceCents)}
                <span className="text-base font-normal text-slate-500"> / night</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">Low-season rate. Peak & holiday pricing applied automatically.</p>
            </div>
            <LinkButton href={`/book?unit=${unit.slug}`} size="xl" variant={isFlagship ? "accent" : "primary"} className="w-full mb-3">
              {isFlagship ? "Book the Flagship" : "Book this apartment"}
            </LinkButton>
            <ul className="space-y-3 text-sm text-slate-600 border-t border-sand-200 pt-4">
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg></div>
                <span>Best-price guarantee</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
                <span>Secure PayFast, Stripe & Ozow payments</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>
                <span>Min. 2 nights (3 in peak season)</span>
              </li>
              <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors">
                <div className="h-9 w-9 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                <span>Sleeps up to {unit.sleeps} guests</span>
              </li>
              {isFlagship && (
                <li className="flex items-center gap-3 p-3 rounded-xl hover:bg-sand-50 transition-colors bg-accent-50 border border-accent-100">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-accent-100 flex items-center justify-center text-accent-600"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>
                  <span className="font-medium text-accent-900">Entire 3-bed apartment &mdash; not rented separately</span>
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </Container>
  );
}