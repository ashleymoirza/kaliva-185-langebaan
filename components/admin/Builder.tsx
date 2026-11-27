"use client";

import { useMemo, useRef, useState } from "react";
import { BLOCKS, BLOCK_ORDER, type Block, type BlockType, type FieldDef, type SiteLayout } from "@/lib/builder/types";
import { UploadButton } from "@/components/admin/ImageUploader";

export interface BuilderPage {
  slug: string;
  label: string;
  path: string;
}

type Props = Record<string, unknown>;

function newId(type: BlockType) {
  return `blk-${type}-${Math.random().toString(36).slice(2, 8)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

export default function Builder({
  pages,
  initialPage,
  initialLayout,
}: {
  pages: BuilderPage[];
  initialPage: string;
  initialLayout: SiteLayout;
}) {
  const [page, setPage] = useState(initialPage);
  const [layout, setLayout] = useState<SiteLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string | null>(initialLayout.blocks[0]?.id ?? null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const dragFrom = useRef<number | null>(null);

  const selected = useMemo(() => layout.blocks.find((b) => b.id === selectedId) ?? null, [layout.blocks, selectedId]);
  const currentPage = pages.find((p) => p.slug === page);

  function update(mut: (l: SiteLayout) => SiteLayout) {
    setLayout((l) => mut({ ...l, blocks: [...l.blocks] }));
    setDirty(true);
  }

  function setProp(key: string, value: unknown) {
    if (!selected) return;
    update((l) => ({
      ...l,
      blocks: l.blocks.map((b) => (b.id === selected.id ? { ...b, props: { ...b.props, [key]: value } } : b)),
    }));
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= layout.blocks.length) return;
    update((l) => {
      const blocks = [...l.blocks];
      const [m] = blocks.splice(from, 1);
      blocks.splice(to, 0, m);
      return { ...l, blocks };
    });
  }

  function addBlock(type: BlockType) {
    const block: Block = { id: newId(type), type, visible: true, props: clone(BLOCKS[type].defaultProps) };
    update((l) => ({ ...l, blocks: [...l.blocks, block] }));
    setSelectedId(block.id);
  }

  function removeBlock(id: string) {
    update((l) => ({ ...l, blocks: l.blocks.filter((b) => b.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateBlock(id: string) {
    const src = layout.blocks.find((b) => b.id === id);
    if (!src) return;
    const copy: Block = { ...clone(src), id: newId(src.type) };
    update((l) => ({ ...l, blocks: [...l.blocks, copy] }));
    setSelectedId(copy.id);
  }

  async function switchPage(slug: string) {
    setBusy(true);
    const res = await fetch(`/api/admin/site?page=${slug}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok && data.layout) {
      setLayout(data.layout);
      setPage(slug);
      setSelectedId(data.layout.blocks[0]?.id ?? null);
      setDirty(false);
    }
    setBusy(false);
  }

  async function save() {
    setBusy(true);
    setFlash(null);
    const res = await fetch(`/api/admin/site?page=${page}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...layout, page }),
    });
    const data = await res.json();
    if (res.ok && data.layout) {
      setLayout(data.layout);
      setDirty(false);
      setFlash("Draft saved.");
    } else {
      setFlash(data.message ?? "Could not save.");
    }
    setBusy(false);
  }

  async function publish() {
    setBusy(true);
    await save();
    const res = await fetch(`/api/admin/site?page=${page}&action=publish`, { method: "POST" });
    const data = await res.json();
    setFlash(res.ok ? "Published — live site updated." : data.message ?? "Publish failed.");
    setBusy(false);
    setPreviewKey((k) => k + 1);
  }

  async function reset() {
    if (!confirm("Reset this page to the default layout? Your draft will be replaced.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/site?page=${page}&action=reset`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.layout) {
      setLayout(data.layout);
      setSelectedId(data.layout.blocks[0]?.id ?? null);
      setDirty(false);
    }
    setFlash("Reset to default.");
    setBusy(false);
  }

  const inputCls =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ─── Canvas / block list ─── */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <select className={inputCls + " max-w-xs"} value={page} onChange={(e) => switchPage(e.target.value)} disabled={busy}>
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
          <button onClick={save} disabled={busy || !dirty} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-800 ring-1 ring-brand-200 disabled:opacity-50">
            {dirty ? "Save draft" : "Saved"}
          </button>
          <button onClick={publish} disabled={busy} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Publish
          </button>
          <button onClick={reset} disabled={busy} className="rounded-full px-4 py-2 text-sm text-slate-500 hover:text-red-600">
            Reset
          </button>
          <a
            href={`${currentPage?.path ?? "/"}?preview=1&_=${previewKey}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto rounded-full px-4 py-2 text-sm text-brand-700 underline"
          >
            Preview draft ↗
          </a>
        </div>

        {flash && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{flash}</p>}

        <p className="mt-4 text-xs text-slate-500">
          Drag a section by its handle to reorder. Click a section to edit it.
        </p>

        <ul className="mt-3 space-y-2">
          {layout.blocks.map((b, i) => (
            <li
              key={b.id}
              draggable
              onDragStart={(e) => {
                dragFrom.current = i;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (dragFrom.current !== null) move(dragFrom.current, i);
                dragFrom.current = null;
              }}
              onClick={() => setSelectedId(b.id)}
              className={`flex items-center gap-3 rounded-xl border bg-white px-3 py-3 shadow-sm ${
                selectedId === b.id ? "border-brand-500 ring-1 ring-brand-300" : "border-slate-200"
              }`}
            >
              <span className="cursor-grab select-none text-slate-400" aria-hidden="true" title="Drag to reorder">⠿</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{BLOCKS[b.type]?.label ?? b.type}</p>
                <p className="truncate text-xs text-slate-500">
                  {typeof b.props.heading === "string" ? (b.props.heading as string) : BLOCKS[b.type]?.description}
                </p>
              </div>
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => update((l) => ({ ...l, blocks: l.blocks.map((x) => (x.id === b.id ? { ...x, visible: !x.visible } : x)) }))}
                  className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" title={b.visible ? "Hide" : "Show"}>
                  {b.visible ? "👁" : "🚫"}
                </button>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move up">↑</button>
                <button onClick={() => move(i, i + 1)} disabled={i === layout.blocks.length - 1} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30" title="Move down">↓</button>
                <button onClick={() => duplicateBlock(b.id)} className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100" title="Duplicate">⧉</button>
                <button onClick={() => removeBlock(b.id)} className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50" title="Delete">✕</button>
              </div>
            </li>
          ))}
          {layout.blocks.length === 0 && (
            <li className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              This page is empty. Add a section below.
            </li>
          )}
        </ul>

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Add a section</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BLOCK_ORDER.map((type) => (
              <button key={type} onClick={() => addBlock(type)} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300">
                + {BLOCKS[type].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Inspector ─── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Theme</h3>
          <div className="mt-3 flex items-center gap-3">
            <label className="text-xs text-slate-600">
              Brand colour
              <input
                type="color"
                value={layout.theme.primary}
                onChange={(e) => update((l) => ({ ...l, theme: { ...l.theme, primary: e.target.value } }))}
                className="mt-1 block h-9 w-16 rounded border border-slate-200"
              />
            </label>
            <label className="text-xs text-slate-600">
              Corner radius (px)
              <input
                type="number"
                min={0}
                max={48}
                value={layout.theme.radius}
                onChange={(e) => update((l) => ({ ...l, theme: { ...l.theme, radius: Number(e.target.value) } }))}
                className={inputCls + " mt-1"}
              />
            </label>
          </div>
        </div>

        {selected ? (
          <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">
              {BLOCKS[selected.type]?.label} settings
            </h3>
            <div className="mt-4 space-y-4">
              {BLOCKS[selected.type]?.fields.map((f) => (
                <FieldEditor
                  key={f.key}
                  field={f}
                  value={selected.props[f.key]}
                  onChange={(v) => setProp(f.key, v)}
                  inputCls={inputCls}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
            Select a section to edit its content.
          </div>
        )}
      </aside>
    </div>
  );
}

function FieldEditor({
  field,
  value,
  onChange,
  inputCls,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
  inputCls: string;
}) {
  if (field.kind === "list") {
    const items = Array.isArray(value) ? (value as Props[]) : [];
    return (
      <div>
        <span className="mb-1 block text-xs font-medium text-slate-700">{field.label}</span>
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{field.itemLabel ?? "Item"} {i + 1}</span>
                <div className="flex gap-1">
                  <button onClick={() => { const c = clone(items); if (i > 0) { [c[i - 1], c[i]] = [c[i], c[i - 1]]; onChange(c); } }} disabled={i === 0} className="rounded px-1.5 text-xs text-slate-500 disabled:opacity-30">↑</button>
                  <button onClick={() => { const c = clone(items); if (i < c.length - 1) { [c[i + 1], c[i]] = [c[i], c[i + 1]]; onChange(c); } }} disabled={i === items.length - 1} className="rounded px-1.5 text-xs text-slate-500 disabled:opacity-30">↓</button>
                  <button onClick={() => onChange(clone(items).filter((_, x) => x !== i))} className="rounded px-1.5 text-xs text-red-500">✕</button>
                </div>
              </div>
              <div className="space-y-2">
                {(field.itemFields ?? []).map((sub) => (
                  <FieldEditor
                    key={sub.key}
                    field={sub}
                    value={item[sub.key]}
                    onChange={(v) => {
                      const c = clone(items);
                      c[i] = { ...c[i], [sub.key]: v };
                      onChange(c);
                    }}
                    inputCls={inputCls}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => onChange([...clone(items), Object.fromEntries((field.itemFields ?? []).map((f) => [f.key, ""]))])}
          className="mt-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200"
        >
          + Add {field.itemLabel ?? "item"}
        </button>
      </div>
    );
  }

  const str = typeof value === "string" || typeof value === "number" ? String(value) : "";

  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">{field.label}</span>
      {field.kind === "textarea" ? (
        <textarea className={inputCls} rows={3} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      ) : field.kind === "number" ? (
        <input type="number" className={inputCls} value={str} onChange={(e) => onChange(Number(e.target.value))} />
      ) : (
        <input className={inputCls} value={str} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
      )}
      {field.kind === "image" && (
        <span className="mt-2 flex items-center gap-3">
          {str && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={str} alt="" className="h-16 w-24 rounded object-cover ring-1 ring-slate-200" />
          )}
          <UploadButton label="Upload" onUploaded={(url) => onChange(url)} />
        </span>
      )}
    </label>
  );
}
