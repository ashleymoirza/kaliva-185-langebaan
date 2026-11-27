import Image from "next/image";
import Link from "next/link";
import type { Property } from "@/lib/properties";
import { unitsForProperty } from "@/lib/units";
import { formatZAR } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

export default function PropertyCard({ property }: { property: Property }) {
  const units = unitsForProperty(property.slug);
  const from = units.length ? Math.min(...units.map((u) => u.basePriceCents)) : 0;
  const sleeps = units.length ? Math.max(...units.map((u) => u.sleeps)) : 0;
  const roomCount = units.length;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <Link href={`/properties/${property.slug}`} className="relative block aspect-[4/3] overflow-hidden zoom-hover bg-sand-50" aria-label={`View ${property.name} details`}>
        {property.images[0] && (
          <Image
            src={property.images[0]}
            alt={property.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <Badge variant="brand" className="shadow-card">
            {property.location}
          </Badge>
          {property.featured && (
            <Badge variant="accent" className="shadow-card">Featured</Badge>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-bold text-slate-900 leading-tight mb-1">
          <Link href={`/properties/${property.slug}`} className="hover:text-brand-700 transition-colors">
            {property.name}
          </Link>
        </h3>
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{property.tagline}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-4">
          {roomCount > 0 && (
            <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> {roomCount} room type{roomCount === 1 ? "" : "s"}</li>
          )}
          {sleeps > 0 && (
            <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Sleeps up to {sleeps}</li>
          )}
        </ul>
        <div className="mt-auto flex items-end justify-between border-t border-sand-200 pt-4">
          {from > 0 ? (
            <div>
              <p className="text-xs text-slate-500">From</p>
              <p className="text-2xl font-extrabold text-slate-900">{formatZAR(from)}</p>
              <p className="text-xs text-slate-500">per night</p>
            </div>
          ) : (
            <span />
          )}
          <LinkButton href={`/properties/${property.slug}`} size="md" variant="primary">
            View property
          </LinkButton>
        </div>
      </div>
    </article>
  );
}