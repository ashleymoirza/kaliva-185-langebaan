import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPropertyBySlug, listActiveProperties } from "@/lib/properties-store";
import { unitsForProperty } from "@/lib/units";
import { AMENITY_LABELS_PROPERTY } from "@/lib/properties";
import Gallery from "@/components/Gallery";
import UnitCard from "@/components/UnitCard";
import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import { LinkButton } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return { title: "Guest house not found" };
  return {
    title: property.name,
    description: `${property.tagline}. ${property.description}`.slice(0, 300),
    alternates: { canonical: `/properties/${property.slug}` },
    openGraph: property.images[0] ? { images: [{ url: property.images[0] }] } : undefined,
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property || property.active === false) notFound();

  const rooms = unitsForProperty(property.slug);
  const others = (await listActiveProperties()).filter((p) => p.slug !== property.slug).slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: property.name,
    description: property.description,
    address: { "@type": "PostalAddress", addressLocality: property.location, addressCountry: "ZA" },
  };

  return (
    <Container className="py-10">
      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <span className="px-2">/</span>
        <Link href="/properties" className="hover:text-brand-700">Guest houses</Link>
        <span className="px-2">/</span>
        <span className="text-slate-700">{property.name}</span>
      </nav>

      <Gallery images={property.images} alt={property.name} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">{property.location}</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900">{property.name}</h1>
          <p className="mt-2 text-slate-600">{property.tagline}</p>
          <p className="mt-6 leading-relaxed text-slate-700">{property.description}</p>

          {property.amenities.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-semibold text-slate-900">Facilities</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <Badge key={a}>{AMENITY_LABELS_PROPERTY[a] ?? a}</Badge>
                ))}
              </div>
            </>
          )}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{rooms.length} room type{rooms.length === 1 ? "" : "s"}</h2>
            <p className="mt-2 text-sm text-slate-500">Choose a room below to see live rates and book.</p>
            <LinkButton href={`/book`} className="mt-5 w-full py-3">Check availability</LinkButton>
          </div>
        </aside>
      </div>

      {rooms.length > 0 && (
        <section className="mt-14">
          <h2 className="text-2xl font-bold text-slate-900">Rooms at {property.name}</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rooms.map((u) => <UnitCard key={u.slug} unit={u} />)}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900">Other guest houses</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((p) => (
              <div key={p.slug} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{p.location}</p>
                <h3 className="mt-1 font-semibold text-slate-900">
                  <Link href={`/properties/${p.slug}`} className="hover:text-brand-700">{p.name}</Link>
                </h3>
                <p className="mt-1 text-sm text-slate-600">{p.tagline}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </Container>
  );
}
