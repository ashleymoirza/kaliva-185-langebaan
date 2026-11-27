"use client";

import { useMemo, useState } from "react";
import type { Property } from "@/lib/properties";
import { unitsForProperty } from "@/lib/units";
import PropertyCard from "@/components/PropertyCard";

export default function PropertyFilters({ properties }: { properties: Property[] }) {
  const locations = useMemo(
    () => [...new Set(properties.map((p) => p.location).filter(Boolean))].sort(),
    [properties],
  );
  const [location, setLocation] = useState("any");
  const [minSleeps, setMinSleeps] = useState(0);

  const filtered = useMemo(
    () =>
      properties.filter((p) => {
        if (location !== "any" && p.location !== location) return false;
        if (minSleeps) {
          const max = Math.max(0, ...unitsForProperty(p.slug).map((u) => u.sleeps));
          if (max < minSleeps) return false;
        }
        return true;
      }),
    [properties, location, minSleeps],
  );

  const selectCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-500";

  return (
    <div>
      <div className="grid gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Area</span>
          <select className={selectCls} value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="any">Any area</option>
            {locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-700">Guests</span>
          <select className={selectCls} value={minSleeps} onChange={(e) => setMinSleeps(Number(e.target.value))}>
            <option value={0}>Any</option>
            {[2, 4, 6, 8, 10].map((n) => <option key={n} value={n}>{n}+ guests</option>)}
          </select>
        </label>
        <p className="self-end text-sm text-slate-500" aria-live="polite">
          {filtered.length} propert{filtered.length === 1 ? "y" : "ies"}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
          No guest houses match those filters.
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => <PropertyCard key={p.slug} property={p} />)}
        </div>
      )}
    </div>
  );
}
