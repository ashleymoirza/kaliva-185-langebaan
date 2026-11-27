"use client";

import { useState } from "react";
import type { Property } from "@/lib/properties";
import { AMENITY_LABELS_PROPERTY } from "@/lib/properties";
import { ImageGalleryEditor } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/Button";

const BLANK: Property = {
  slug: "", name: "", tagline: "", location: "", description: "",
  images: [], amenities: [], featured: false, active: true,
};

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

export default function PropertyManager({ initialProperties }: { initialProperties: Property[] }) {
  const [list, setList] = useState<Property[]>(initialProperties);
  const [editing, setEditing] = useState<Property | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [amenityText, setAmenityText] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startNew() {
    setEditing({ ...BLANK });
    setAmenityText("");
    setIsNew(true);
    setErrors({});
    setFlash(null);
  }

  function startEdit(p: Property) {
    setEditing({ ...p, images: [...p.images], amenities: [...p.amenities] });
    setAmenityText(p.amenities.join(", "));
    setIsNew(false);
    setErrors({});
    setFlash(null);
  }

  function set<K extends keyof Property>(key: K, value: Property[K]) {
    setEditing((e) => (e ? { ...e, [key]: value } : e));
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setErrors({});
    const payload: Property = { ...editing, amenities: amenityText.split(",").map((s) => s.trim()).filter(Boolean) };
    const res = await fetch("/api/admin/properties", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setErrors(data.errors ?? { _: data.message ?? "Could not save." });
      setFlash(null);
    } else {
      const saved: Property = data.property;
      setList((l) => {
        const i = l.findIndex((p) => p.slug === saved.slug);
        return i >= 0 ? l.map((p) => (p.slug === saved.slug ? saved : p)) : [...l, saved];
      });
      setEditing(saved);
      setIsNew(false);
      setFlash("Saved.");
    }
    setBusy(false);
  }

  async function remove(slug: string) {
    if (!confirm(`Delete "${slug}"? This cannot be undone.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/properties?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
    if (res.ok) {
      setList((l) => l.filter((p) => p.slug !== slug));
      if (editing?.slug === slug) setEditing(null);
      setFlash("Deleted.");
    }
    setBusy(false);
  }

  const inputCls = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500";

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div>
        <Button onClick={startNew} className="w-full">+ New guest house</Button>
        <ul className="mt-4 space-y-2">
          {list.map((p) => (
            <li key={p.slug}>
              <button
                onClick={() => startEdit(p)}
                className={`w-full rounded-xl border bg-white px-3 py-3 text-left shadow-sm ${
                  editing?.slug === p.slug ? "border-brand-500 ring-1 ring-brand-300" : "border-slate-200"
                }`}
              >
                <span className="block truncate text-sm font-semibold text-slate-800">{p.name}</span>
                <span className="block truncate text-xs text-slate-500">{p.location || p.slug}</span>
                <span className="mt-1 flex gap-2 text-[11px]">
                  {p.featured && <span className="rounded bg-amber-100 px-1.5 text-amber-800">featured</span>}
                  {p.active === false && <span className="rounded bg-slate-200 px-1.5 text-slate-700">hidden</span>}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="text-sm text-slate-500">No guest houses yet.</li>}
        </ul>
      </div>

      {editing ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">{isNew ? "New guest house" : `Editing: ${editing.name}`}</h3>
            {!isNew && (
              <button onClick={() => remove(editing.slug)} className="text-xs text-red-600 hover:underline" disabled={busy}>
                Delete
              </button>
            )}
          </div>

          {flash && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{flash}</p>}
          {errors._ && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors._}</p>}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Name</span>
              <input className={inputCls} value={editing.name}
                onChange={(e) => { const name = e.target.value; set("name", name); if (isNew) set("slug", slugify(name)); }} />
              {errors.name && <span className="text-xs text-red-600">{errors.name}</span>}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Web address (slug)</span>
              <input className={inputCls} value={editing.slug} disabled={!isNew} onChange={(e) => set("slug", slugify(e.target.value))} />
              {errors.slug && <span className="text-xs text-red-600">{errors.slug}</span>}
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-700">Area / location</span>
              <input className={inputCls} value={editing.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Langebaan West" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Tagline</span>
              <input className={inputCls} value={editing.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="One line that sells it" />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Description</span>
              <textarea className={inputCls} rows={5} value={editing.description} onChange={(e) => set("description", e.target.value)} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Facilities (comma separated)</span>
              <input className={inputCls} value={amenityText} onChange={(e) => setAmenityText(e.target.value)}
                placeholder="wifi, braai, parking, sea view" />
              <span className="mt-1 block text-xs text-slate-400">Known keys: {Object.keys(AMENITY_LABELS_PROPERTY).join(", ")}</span>
            </label>
          </div>

          <div className="mt-5">
            <span className="mb-2 block text-sm font-medium text-slate-700">Photos</span>
            <ImageGalleryEditor images={editing.images} onChange={(next) => set("images", next)} />
          </div>

          <div className="mt-5 flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editing.featured} onChange={(e) => set("featured", e.target.checked)} /> Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => set("active", e.target.checked)} /> Visible on the site
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save guest house"}</Button>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={busy}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
          Select a guest house on the left to edit it, or create a new one.
        </div>
      )}
    </div>
  );
}
