"use client";

import Image from "next/image";
import Link from "next/link";
import type { Unit } from "@/lib/units";
import { VIEW_LABELS } from "@/lib/units";
import { formatZAR } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";

export default function UnitCard({ unit }: { unit: Unit }) {
  const isFlagship = unit.slug === "beachfront-3br";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <Link href={`/units/${unit.slug}`} className="relative block aspect-[4/3] overflow-hidden zoom-hover" aria-label={`View ${unit.name} details`}>
        <Image
          src={unit.images[0] ?? "/images/units/placeholder.svg"}
          alt={unit.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          <Badge variant="brand" className="shadow-card">
            {VIEW_LABELS[unit.view]}
          </Badge>
          {isFlagship && (
            <Badge variant="accent" className="shadow-card">
              Flagship · Private Braai
            </Badge>
          )}
        </div>
        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/90 text-brand-600 shadow-card transition-transform hover:scale-110" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </span>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-bold text-slate-900 leading-tight">
            <Link href={`/units/${unit.slug}`} className="hover:text-brand-700 transition-colors">
              {unit.name}
            </Link>
          </h3>
          {isFlagship && (
            <Badge variant="accent" size="sm">6 Sleeper · 3 Bed · Private Braai</Badge>
          )}
        </div>
        <p className="text-sm text-slate-600 line-clamp-2 mb-3">{unit.tagline}</p>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-4">
          <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Sleeps {unit.sleeps}</li>
          <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> {unit.bedrooms === 0 ? "Studio" : `${unit.bedrooms} bedroom`}</li>
          <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> {unit.bathrooms} bath</li>
          <li className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/></svg> {unit.sizeSqm} m²</li>
        </ul>
        <div className="mt-auto flex items-end justify-between border-t border-sand-200 pt-4">
          <div>
            <p className="text-xs text-slate-500">From</p>
            <p className="text-2xl font-extrabold text-slate-900">{formatZAR(unit.basePriceCents)}</p>
            <p className="text-xs text-slate-500">per night, low season</p>
          </div>
          <LinkButton href={`/book?unit=${unit.slug}`} size="md" variant={isFlagship ? "accent" : "primary"} className="whitespace-nowrap">
            {isFlagship ? "Book the Flagship" : "Book now"}
          </LinkButton>
        </div>
      </div>
    </article>
  );
}