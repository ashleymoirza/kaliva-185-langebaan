"use client";

import { useMemo, useState } from "react";
import type { Unit, ViewType } from "@/lib/units";
import { VIEW_LABELS } from "@/lib/units";
import UnitCard from "@/components/UnitCard";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type SortKey = "recommended" | "price-asc" | "price-desc" | "sleeps-desc";

export default function UnitFilters({ units }: { units: Unit[] }) {
  const [bedrooms, setBedrooms] = useState<string>("any");
  const [view, setView] = useState<string>("any");
  const [minSleeps, setMinSleeps] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(0);
  const [sort, setSort] = useState<SortKey>("recommended");

  const maxUnitPrice = useMemo(
    () => Math.max(...units.map((u) => u.basePriceCents), 0),
    [units],
  );

  const filtered = useMemo(() => {
    const list = units.filter((u) => {
      if (bedrooms !== "any" && String(u.bedrooms) !== bedrooms) return false;
      if (view !== "any" && u.view !== view) return false;
      if (minSleeps && u.sleeps < minSleeps) return false;
      if (maxPrice && u.basePriceCents > maxPrice) return false;
      return true;
    });
    switch (sort) {
      case "price-asc":
        return [...list].sort((a, b) => a.basePriceCents - b.basePriceCents);
      case "price-desc":
        return [...list].sort((a, b) => b.basePriceCents - a.basePriceCents);
      case "sleeps-desc":
        return [...list].sort((a, b) => b.sleeps - a.sleeps);
      default:
        return [...list].sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    }
  }, [units, bedrooms, view, minSleeps, maxPrice, sort]);

  const selectCls = cn(
    "input-base w-full appearance-none",
    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")] bg-center bg-no-repeat bg-right pr-10"
  );

  const filterGroups = [
    {
      label: "Bedrooms",
      select: (
        <select className={selectCls} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)}>
          <option value="any">Any</option>
          <option value="0">Studio</option>
          <option value="1">1 bedroom</option>
          <option value="2">2 bedrooms</option>
          <option value="3">3+ bedrooms</option>
        </select>
      ),
    },
    {
      label: "View",
      select: (
        <select className={selectCls} value={view} onChange={(e) => setView(e.target.value)}>
          <option value="any">Any view</option>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <option key={v} value={v}>
              {VIEW_LABELS[v]}
            </option>
          ))}
        </select>
      ),
    },
    {
      label: "Guests",
      select: (
        <select className={selectCls} value={minSleeps} onChange={(e) => setMinSleeps(Number(e.target.value))}>
          <option value={0}>Any</option>
          {[2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>
              {n}+ guests
            </option>
          ))}
        </select>
      ),
    },
    {
      label: "Max nightly price",
      select: (
        <select className={selectCls} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))}>
          <option value={0}>Any price</option>
          {maxUnitPrice > 0 &&
            [100000, 150000, 200000, 250000, 300000]
              .filter((p) => p <= maxUnitPrice + 50000)
              .map((p) => (
                <option key={p} value={p}>
                  Under R {(p / 100).toLocaleString("en-ZA")}
                </option>
              ))}
        </select>
      ),
    },
    {
      label: "Sort",
      select: (
        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="recommended">Recommended</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="sleeps-desc">Sleeps most</option>
        </select>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-sand-200 bg-white p-5 shadow-card grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {filterGroups.map((group) => (
          <label key={group.label} className="text-sm">
            <span className="block font-medium text-slate-700 mb-1.5 font-airbnb">{group.label}</span>
            {group.select}
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <p className="text-sm text-slate-500 font-airbnb" aria-live="polite">
          {filtered.length} apartment{filtered.length === 1 ? "" : "s"} found
        </p>
        {filtered.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: "bedrooms", active: bedrooms !== "any", label: bedrooms === "0" ? "Studio" : `${bedrooms} bedroom`, clear: () => setBedrooms("any") },
              { key: "view", active: view !== "any", label: VIEW_LABELS[view as ViewType], clear: () => setView("any") },
              { key: "minSleeps", active: minSleeps > 0, label: `${minSleeps}+ guests`, clear: () => setMinSleeps(0) },
              { key: "maxPrice", active: maxPrice > 0, label: `Under R${(maxPrice / 100).toLocaleString("en-ZA")}`, clear: () => setMaxPrice(0) },
            ]
              .filter((f) => f.active)
              .map((f) => (
                <Badge key={f.key} variant="outline" className="gap-1.5 font-airbnb">
                  {f.label}
                  <button
                    type="button"
                    onClick={f.clear}
                    className="text-slate-500 hover:text-error-600 transition-colors"
                    aria-label={`Remove ${f.label} filter`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </Badge>
              ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sand-200 p-12 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-sand-300 mb-4"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <p className="text-lg font-medium text-slate-600 font-airbnb">No apartments match those filters</p>
          <p className="mt-2 text-slate-500 font-airbnb">Try widening your search or clearing some filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((u) => (
            <UnitCard key={u.slug} unit={u} />
          ))}
        </div>
      )}
    </div>
  );
}